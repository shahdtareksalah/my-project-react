import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { IRtcEngine } from 'react-native-agora';
import { colors } from '../theme/colors';
import { AGORA_APP_ID } from '../config/agora';
import { PARENT_RINGBACK } from '../config/callAudio';
import type { AudioCallRouteParams, CallUiState } from '../types/call';
import { endCall, initiateAudioCall } from '../services/callService';
import { subscribeCallStatusEvents } from '../services/callEvents';
import { createAndJoinAgoraChannel } from '../services/agoraEngine';
import { parseAgoraSession, type AgoraSession } from '../utils/agoraSession';

const CALL_TIMEOUT_MS = 45000;

async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') return true;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone Permission',
    message: 'SmartAid needs microphone access for audio calls.',
    buttonPositive: 'Continue',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function AudioCallScreen({ navigation, route }: any) {
  const params = route.params as AudioCallRouteParams;
  const engineRef = useRef<IRtcEngine | null>(null);
  const ringbackRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const callIdRef = useRef<string | null>(params.callId ?? null);

  const [callState, setCallState] = useState<CallUiState>(
    params.isIncoming ? 'connected' : params.callId ? 'ringing' : 'initiating',
  );
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [statusText, setStatusText] = useState(
    params.isIncoming ? 'Connected' : params.callId ? 'Ringing...' : 'Calling...',
  );
  const [displayName, setDisplayName] = useState(params.callerName ?? 'Caller');

  const stopRingback = useCallback(async () => {
    try {
      await ringbackRef.current?.stopAsync();
      await ringbackRef.current?.unloadAsync();
    } catch {
      // ignore cleanup errors
    }
    ringbackRef.current = null;
  }, []);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const markConnected = useCallback(() => {
    clearCallTimeout();
    void stopRingback();
    setCallState('connected');
    setStatusText('Connected');
  }, [clearCallTimeout, stopRingback]);

  const finishCall = useCallback(
    async (reason: string, alertMessage?: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearCallTimeout();
      await stopRingback();

      try {
        engineRef.current?.leaveChannel();
        engineRef.current?.unregisterEventHandler({});
        engineRef.current?.release();
      } catch (error) {
        console.warn('Agora cleanup failed', error);
      }
      engineRef.current = null;

      const callId = callIdRef.current;
      if (callId) {
        void endCall(callId, reason).catch((error) => console.warn('Failed to end call', error));
      }

      setCallState('ended');
      if (alertMessage) {
        Alert.alert('Call Ended', alertMessage, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        navigation.goBack();
      }
    },
    [clearCallTimeout, navigation, stopRingback],
  );

  const startRingback = useCallback(async () => {
    if (params.isIncoming) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(PARENT_RINGBACK, {
        isLooping: true,
        volume: 0.9,
      });
      ringbackRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.warn('Failed to play ringback tone', error);
    }
  }, [params.isIncoming]);

  const joinAgoraChannel = useCallback(
    async (session: AgoraSession) => {
      const hasMicPermission = await requestMicrophonePermission();
      if (!hasMicPermission) {
        Alert.alert('Permission Needed', 'Microphone permission is required for audio calls.');
        navigation.goBack();
        return;
      }

      const engine = await createAndJoinAgoraChannel({
        session,
        eventHandler: {
          onJoinChannelSuccess: () => {
            if (!params.isIncoming) {
              setCallState('ringing');
              setStatusText('Ringing...');
              void startRingback();
            } else {
              markConnected();
            }
          },
          onUserJoined: (_connection, remoteUid) => {
            setRemoteUsers((current) =>
              current.includes(remoteUid) ? current : [...current, remoteUid],
            );
            markConnected();
          },
          onUserOffline: (_connection, remoteUid) => {
            setRemoteUsers((current) => current.filter((uid) => uid !== remoteUid));
          },
          onLeaveChannel: () => {
            setStatusText('Call ended');
          },
          onError: (errorCode, msg) => {
            setStatusText(msg || `Call error: ${errorCode}`);
          },
        },
        onJoinError: (code, msg) => {
          setStatusText(msg || `Call error: ${code}`);
        },
      });

      engine.setDefaultAudioRouteToSpeakerphone(true);
      engine.setEnableSpeakerphone(true);
      engineRef.current = engine;
    },
    [markConnected, navigation, params.isIncoming, startRingback],
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        let session: AgoraSession | null = null;

        const targetId = params.receiverId ?? params.childId;
        if (targetId && !params.callId) {
          setCallState('initiating');
          setStatusText('Calling...');
          const initiated = await initiateAudioCall(targetId);
          callIdRef.current = initiated.call_id;
          session = initiated.agoraSession;
          if (params.callerName) setDisplayName(params.callerName);
        } else if (params.callId) {
          callIdRef.current = params.callId;
          session = parseAgoraSession(
            {
              call_id: params.callId,
              token: params.token,
              channel_name: params.channelName,
              channel: params.channelName,
              agora_app_id: params.agoraAppId,
              uid: params.uid,
            },
            params.callId,
          );
        }

        if (!session) {
          throw new Error('Missing Agora credentials. The server must return token and channel_name.');
        }

        if (!mounted) return;

        await joinAgoraChannel(session);

        if (!params.isIncoming && mounted) {
          timeoutRef.current = setTimeout(() => {
            void finishCall('timeout', 'User Unavailable');
          }, CALL_TIMEOUT_MS);
        }
      } catch (error: any) {
        Alert.alert('Call Failed', error?.message || 'Unable to start the call.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
      clearCallTimeout();
      void stopRingback();
      try {
        engineRef.current?.leaveChannel();
        engineRef.current?.unregisterEventHandler({});
        engineRef.current?.release();
      } catch (error) {
        console.warn('Agora cleanup failed', error);
      }
      engineRef.current = null;

      if (!endedRef.current && callIdRef.current && !params.isIncoming) {
        endedRef.current = true;
        void endCall(callIdRef.current, 'ended_by_user').catch((error) =>
          console.warn('Failed to end call during cleanup', error),
        );
      }
    };
  }, []);

  useEffect(() => {
    if (params.isIncoming) return undefined;

    const unsubscribe = subscribeCallStatusEvents((event) => {
      if (event.call_id !== callIdRef.current) return;

      if (event.type === 'call_answered') {
        markConnected();
        return;
      }

      if (event.type === 'call_missed') {
        void finishCall(event.reason || 'missed', 'User did not answer');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [finishCall, markConnected, params.isIncoming]);

  const hangUp = () => {
    void finishCall('ended_by_user');
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    engineRef.current?.muteLocalAudioStream(nextMuted);
    setMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    const nextSpeaker = !speakerOn;
    engineRef.current?.setEnableSpeakerphone(nextSpeaker);
    setSpeakerOn(nextSpeaker);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.status}>{statusText}</Text>
        <View style={styles.avatar}>
          <Ionicons name="person" size={54} color={colors.white} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {displayName || (params.isIncoming ? 'Incoming call' : 'Audio call')}
        </Text>
        <Text style={styles.subtitle}>
          {callState === 'connected'
            ? remoteUsers.length > 0
              ? 'In call'
              : 'Waiting for the other person'
            : callState === 'ringing'
              ? 'Waiting for answer...'
              : callState === 'initiating'
                ? 'Starting call...'
                : 'Call ended'}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={colors.white} />
            <Text style={styles.controlText}>{muted ? 'Muted' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, styles.hangupButton]} onPress={hangUp}>
            <Ionicons name="call" size={28} color={colors.white} style={styles.hangupIcon} />
            <Text style={styles.controlText}>Hang up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleSpeaker}>
            <Ionicons name={speakerOn ? 'volume-high' : 'volume-low'} size={24} color={colors.white} />
            <Text style={styles.controlText}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  status: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 28,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 15,
    marginTop: 10,
    marginBottom: 52,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: '#2E3E52',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hangupButton: {
    backgroundColor: colors.emergency,
    borderColor: colors.emergency,
  },
  hangupIcon: {
    transform: [{ rotate: '135deg' }],
  },
  controlText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
});
