import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, { SpeechEndEvent, SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';
import { syncPushTokenToBackend } from '../services/notificationService';
import { useNotifications } from '../context/NotificationsContext';

export function HomeScreen({ navigation }: any) {
  const { sendEmergency, linkedChildren, fetchLinkedChildren } = useSafety();
  const { unreadCount } = useNotifications();
  const [username, setUsername] = useState('Guest');

  useEffect(() => {
    AsyncStorage.getItem('user_profile').then((raw) => {
      if (raw) {
        try {
          const profile = JSON.parse(raw);
          setUsername(profile?.user?.full_name || profile?.user?.email || 'Guest');
        } catch { /* ignore */ }
      }
    });
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [heardPhrase, setHeardPhrase] = useState('');

  const commandHelp = useMemo(
    () => 'Voice commands: "Open camera", "Read text", "Send help".',
    []
  );

  // Runs once on mount. Token sync is also called after login in LoginScreen.
  // The push-token refresh listener in CallContext handles rotation.
  useEffect(() => {
    void fetchLinkedChildren().catch(() => undefined);
    void syncPushTokenToBackend();
  }, []);

  const startQuickCall = () => {
    if (linkedChildren.length === 0) {
      Alert.alert('No Linked User', 'Link a user account from the dashboard before calling.');
      return;
    }

    if (linkedChildren.length > 1) {
      Alert.alert(
        'Choose a User',
        'Multiple users are linked. Open the Dashboard to call a specific user.',
      );
      return;
    }

    navigation.navigate('AudioCall', {
      childId: linkedChildren[0].id,
      callerName: linkedChildren[0].displayName,
      isIncoming: false,
    });
  };

  useEffect(() => {
    Voice.onSpeechResults = (event: SpeechResultsEvent) => {
      const transcript = event.value?.[0]?.trim() ?? '';
      setHeardPhrase(transcript || 'No speech detected.');
      if (transcript) {
        runVoiceCommand(transcript).catch(() => undefined);
      }
    };

    Voice.onSpeechError = (event: SpeechErrorEvent) => {
      const message = event.error?.message || 'Could not process speech';
      setHeardPhrase('');
      Alert.alert('Speech processing error', message);
    };

    Voice.onSpeechEnd = (_event: SpeechEndEvent) => {
      setIsRecording(false);
      setIsProcessingSpeech(false);
    };

    return () => {
      Voice.destroy().catch(() => undefined);
      Voice.removeAllListeners();
    };
  }, []);

  const runVoiceCommand = async (rawPhrase: string) => {
    const phrase = rawPhrase.trim().toLowerCase();
    if (!phrase) return;

    if (phrase.includes('open camera')) {
      navigation.navigate('CameraAssistance');
    } else if (phrase.includes('read text')) {
      navigation.navigate('OCR', { autoRead: true });
    } else if (phrase.includes('send help')) {
      await sendEmergency('voice');
    }
  };

  const startRecording = async () => {
    if (isRecording || isProcessingSpeech) return;
    try {
      setHeardPhrase('');
      setIsProcessingSpeech(true);
      setIsRecording(true);
      await Voice.start('en-US');
    } catch (error) {
      setIsRecording(false);
      setIsProcessingSpeech(false);
      const message = error instanceof Error ? error.message : 'Could not start recording';
      Alert.alert('Recording error', message);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    try {
      setIsProcessingSpeech(true);
      await Voice.stop();
    } catch (error) {
      setIsProcessingSpeech(false);
      setIsRecording(false);
      const message = error instanceof Error ? error.message : 'Could not process speech';
      Alert.alert('Speech processing error', message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SmartAid</Text>
          <Text style={styles.tagline}>AI-Powered Assistance</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="person-circle-outline" size={38} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{username}</Text>
        </View>

        {/* Tools Section */}
        <Text style={styles.sectionHeading}>Tools</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridCardWrapper} activeOpacity={0.8} onPress={() => navigation.navigate('CameraAssistance')}>
            <View style={styles.toolCard}>
              <View style={[styles.toolIconBg, { backgroundColor: '#E0F7FA' }]}>
                <Ionicons name="hardware-chip-outline" size={32} color="#00BCD4" />
              </View>
              <Text style={styles.toolTitle}>Camera</Text>
              <Text style={styles.toolSubtitle}>Live vision</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCardWrapper} activeOpacity={0.8} onPress={() => navigation.navigate('OCR', { autoRead: true })}>
            <View style={styles.toolCard}>
              <View style={[styles.toolIconBg, { backgroundColor: '#E8EAF6' }]}>
                <Ionicons name="scan-outline" size={32} color="#3F51B5" />
              </View>
              <Text style={styles.toolTitle}>Scan Text</Text>
              <Text style={styles.toolSubtitle}>Read aloud</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Dashboard Section */}
        <Text style={styles.sectionHeading}>Dashboard</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>User Status</Text>
            <View style={styles.safeBadge}>
              <View style={styles.safeDot} />
              <Text style={styles.safeText}>Safe</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.locationText}>Ahmed Ali - Al-Mansour School</Text>
          </View>
          <Text style={styles.updated}>Last updated: 2 minutes ago</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>

        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ChildLocation')}>
          <View style={styles.card}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="map-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.cardTitle}>User Location</Text>
                <Text style={styles.cardSubtitle}>Track and monitor safety</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={'#AAAAAA'} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={startQuickCall}>
          <View style={styles.card}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="call-outline" size={24} color="#1976D2" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.cardTitle}>Call</Text>
                <Text style={styles.cardSubtitle}>Start an audio call with a linked user</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={'#AAAAAA'} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => sendEmergency('manual')}>
          <View style={[styles.card, styles.emergencyCard]}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="warning-outline" size={24} color={'#FFFFFF'} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Emergency</Text>
                <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Quick emergency access</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={'#FFFFFF'} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Voice Navigation */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>Voice Navigation</Text>
            {isProcessingSpeech ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          <Text style={styles.cardSubtitle}>{commandHelp}</Text>
          <View style={styles.voiceControls}>
            <TouchableOpacity
              style={[styles.voiceActionBtn, isRecording ? styles.voiceBtnActive : { backgroundColor: colors.primary }]}
              onPress={startRecording}
              disabled={isRecording || isProcessingSpeech}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-outline" size={18} color={'#FFFFFF'} />
              <Text style={styles.voiceActionText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voiceActionBtn, !isRecording ? styles.voiceBtnDisabled : { backgroundColor: colors.error }]}
              onPress={stopRecording}
              disabled={!isRecording || isProcessingSpeech}
              activeOpacity={0.8}
            >
              <Ionicons name="stop-outline" size={18} color={'#FFFFFF'} />
              <Text style={styles.voiceActionText}>Stop</Text>
            </TouchableOpacity>
          </View>
          {isRecording ? <Text style={styles.recordingText}>Recording in progress...</Text> : null}
          {!!heardPhrase ? <Text style={styles.voiceHeard}>Recognized: {heardPhrase}</Text> : null}
        </View>

        {/* Quick Tip */}
        <View style={styles.card}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIconBg, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="bulb-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.cardTitle}>Quick Tip</Text>
              <Text style={[styles.cardSubtitle, { marginTop: 4 }]}>
                Triple-tap anywhere to quickly access emergency features.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  brand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.emergency,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: {
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    marginTop: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  gridCardWrapper: {
    flex: 1,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  toolSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyCard: {
    backgroundColor: colors.emergency,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safeZone,
  },
  safeText: {
    fontSize: 14,
    color: colors.safeZone,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  updated: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  voiceControls: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 10,
  },
  voiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: colors.emergency,
  },
  voiceBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  voiceActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordingText: {
    marginTop: 12,
    color: colors.emergency,
    fontSize: 13,
    fontWeight: 'bold',
  },
  voiceHeard: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
