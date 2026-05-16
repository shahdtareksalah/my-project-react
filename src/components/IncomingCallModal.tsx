import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';
import { CHILD_RINGTONE } from '../config/callAudio';
import type { IncomingCallPayload } from '../types/call';

const DOUBLE_TAP_MS = 400;

type IncomingCallModalProps = {
  call: IncomingCallPayload | null;
  accepting?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallModal({ call, accepting, onAccept, onDecline }: IncomingCallModalProps) {
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (!call) {
      return undefined;
    }

    let mounted = true;

    const startAlerts = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(CHILD_RINGTONE, {
          isLooping: true,
          volume: 1,
        });
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch (error) {
        console.warn('Failed to play incoming ringtone', error);
      }

      hapticIntervalRef.current = setInterval(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 900);
    };

    void startAlerts();

    return () => {
      mounted = false;
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      void soundRef.current?.stopAsync().catch(() => undefined);
      void soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, [call?.call_id]);

  const handleScreenPress = () => {
    if (accepting) return;

    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      void soundRef.current?.stopAsync().catch(() => undefined);
      onAccept();
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <Modal
      visible={Boolean(call)}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onDecline}
    >
      <Pressable
        style={styles.fullScreen}
        onPress={handleScreenPress}
        accessibilityRole="button"
        accessibilityLabel="Incoming call from Parent. Double tap anywhere to answer."
        accessibilityHint="Double tap anywhere on the screen to answer the call"
      >
        <View style={styles.content} pointerEvents="box-none">
          <View style={styles.avatar}>
            <Ionicons name="call" size={48} color={colors.white} />
          </View>
          <Text style={styles.label}>EMERGENCY CALL</Text>
          <Text style={styles.caller} numberOfLines={2}>
            {call?.caller_name ?? 'Parent'}
          </Text>
          <Text style={styles.hint}>Double tap anywhere to answer</Text>

          {accepting ? (
            <ActivityIndicator size="large" color={colors.white} style={styles.loader} />
          ) : null}

          <Pressable
            style={styles.declineButton}
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel="Decline call"
          >
            <Ionicons name="call" size={28} color={colors.white} style={styles.declineIcon} />
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.emergency,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  caller: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 48,
  },
  loader: {
    marginBottom: 24,
  },
  declineButton: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
    gap: 8,
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
  declineText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
