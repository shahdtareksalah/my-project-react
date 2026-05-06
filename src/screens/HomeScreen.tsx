import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

export function HomeScreen({ navigation }: any) {
  const { sendEmergency } = useSafety();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [heardPhrase, setHeardPhrase] = useState('');

  const commandHelp = useMemo(
    () => 'Voice commands: "Open camera", "Read text", "Send help".',
    []
  );

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
    if (!phrase) {
      return;
    }

    if (phrase.includes('open camera')) {
      navigation.navigate('Camera');
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
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card dark style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={28} color={colors.white} />
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Welcome back</Text>
              <Text style={styles.welcomeName}>Sarah Johnson</Text>
            </View>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-outline" size={24} color={colors.white} />
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>Child Status</Text>
            <View style={styles.safeBadge}>
              <View style={styles.safeDot} />
              <Text style={styles.safeText}>Safe</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.locationText}>Ahmed Ali - Al-Mansour School</Text>
          </View>
          <Text style={styles.updated}>Last updated: 2 minutes ago</Text>
        </Card>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CameraAssistance')}
        >
          <Card dark style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="camera-outline" size={28} color={colors.white} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Camera Assistance</Text>
              <Text style={styles.featureSubtitle}>AI-powered vision support</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ChildLocation')}
        >
          <Card dark style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="location-outline" size={28} color={colors.white} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Child Location</Text>
              <Text style={styles.featureSubtitle}>Track and monitor safety</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => sendEmergency('manual')}
        >
          <View style={[styles.featureCard, styles.emergencyCard]}>
            <View style={styles.featureIcon}>
              <Ionicons name="warning-outline" size={28} color={colors.white} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Emergency</Text>
              <Text style={styles.featureSubtitle}>Quick emergency access</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.white} />
          </View>
        </TouchableOpacity>

        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>Voice Navigation</Text>
            {isProcessingSpeech ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          <Text style={styles.updated}>{commandHelp}</Text>
          <View style={styles.voiceControls}>
            <TouchableOpacity
              style={[styles.voiceActionBtn, isRecording && styles.voiceBtnActive]}
              onPress={startRecording}
              disabled={isRecording || isProcessingSpeech}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-outline" size={18} color={colors.white} />
              <Text style={styles.voiceActionText}>Start Recording</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voiceActionBtn, !isRecording && styles.voiceBtnDisabled]}
              onPress={stopRecording}
              disabled={!isRecording || isProcessingSpeech}
              activeOpacity={0.8}
            >
              <Ionicons name="stop-outline" size={18} color={colors.white} />
              <Text style={styles.voiceActionText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>
          {isRecording ? <Text style={styles.recordingText}>Recording in progress...</Text> : null}
          {!!heardPhrase ? <Text style={styles.voiceHeard}>Recognized: {heardPhrase}</Text> : null}
          {!heardPhrase && !isRecording ? (
            <Text style={styles.voiceHint}>Your recognized speech text will appear here.</Text>
          ) : null}
        </Card>

        <Card style={styles.tipCard}>
          <View style={styles.tipRow}>
            <View style={styles.tipIconBg}>
              <Ionicons name="bulb-outline" size={24} color="#B45309" />
            </View>
            <Text style={styles.tipTitle}>Quick Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Triple-tap anywhere on the screen to quickly access emergency features
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.backgroundDark,
  },
  brand: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  tagline: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  welcomeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  welcomeText: { flex: 1 },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  welcomeName: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  shieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safeZone,
  },
  safeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  updated: {
    fontSize: 12,
    color: colors.textLight,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  emergencyCard: {
    backgroundColor: colors.emergency,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: { flex: 1 },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  featureSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  tipCard: {
    marginTop: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  tipIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  voiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: colors.emergency,
  },
  voiceBtnDisabled: {
    opacity: 0.5,
  },
  voiceControls: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  voiceActionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  recordingText: {
    marginTop: 8,
    color: colors.emergency,
    fontSize: 13,
    fontWeight: '600',
  },
  voiceHeard: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
  },
  voiceHint: {
    marginTop: 8,
    color: colors.textLight,
    fontSize: 12,
  },
});
