import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { apiPost, saveTokens, API_BASE_URL } from '../api/client';
import {
  buildPushTokenBody,
  registerForPushNotifications,
  syncPushTokenToBackend,
} from '../services/notificationService';

export function CreateAccountScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('visually_impaired'); 
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true); // Default to true for premium accessibility flow
  const [loading, setLoading] = useState(false);

  // Voice Flow State Machine
  const [currentStep, setCurrentStep] = useState<'idle' | 'role' | 'fullName' | 'email' | 'phone' | 'done'>('idle');
  const [confirmingName, setConfirmingName] = useState(false);
  const [listeningState, setListeningState] = useState<'idle' | 'speaking' | 'listening' | 'transcribing'>('idle');
  const [lastTap, setLastTap] = useState<number | null>(null);

  // Refs for auto-focusing
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const roles = [
    { id: 'visually_impaired', label: 'Visually Impaired', icon: 'eye-off-outline' },
    { id: 'child', label: 'Child', icon: 'happy-outline' },
    { id: 'parent', label: 'Parent', icon: 'people-outline' },
    { id: 'admin', label: 'Admin', icon: 'shield-checkmark-outline' },
  ];

  // Start the voice signup step
  const parseSpokenNumbers = (text: string): string => {
    const wordMap: Record<string, string> = {
      zero: '0', one: '1', two: '2', three: '3', four: '4',
      five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    };
    return text.split(/\s+/).map((w) => wordMap[w.toLowerCase()] || w).join('');
  };

  const getStepDuration = (step: string): number => {
    if (step === 'confirmName') return 3000;
    if (step === 'role' || step === 'phone') return 5000;
    return 6000;
  };
  const getStepDurationSeconds = (step: string): string => (getStepDuration(step) / 1000) + 's';

  const startVoiceSignupStep = (step: 'role' | 'fullName' | 'email' | 'phone') => {
    setCurrentStep(step);
    setListeningState('speaking');

    let speechText = '';
    if (step === 'role') {
      speechText = 'Select your role. Say 1 for Visually Impaired, 2 for Child, 3 for Parent, or 4 for Admin.';
    } else if (step === 'fullName') {
      speechText = 'Say your full name.';
    } else if (step === 'email') {
      speechText = 'Say your email.';
    } else if (step === 'phone') {
      speechText = 'Say your phone number.';
    }

    const durationMs = getStepDuration(step);

    Speech.speak(speechText, {
      onDone: () => {
        (async () => {
          try {
            // Auto focus inputs at each step
            if (step === 'fullName') nameInputRef.current?.focus();
            else if (step === 'email') emailInputRef.current?.focus();
            else if (step === 'phone') phoneInputRef.current?.focus();

            // Request Mic Permissions
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Microphone permissions are required for voice navigation.');
              setListeningState('idle');
              return;
            }

            setListeningState('listening');

            // Configure audio recording settings
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });

            try {
              if (recordingRef.current) {
                await recordingRef.current.stopAndUnloadAsync();
              }
            } catch (_) {}
            recordingRef.current = new Audio.Recording();
            await recordingRef.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await recordingRef.current.startAsync();

            setTimeout(async () => {
              try {
                setListeningState('transcribing');
                await recordingRef.current?.stopAndUnloadAsync();
                const uri = recordingRef.current?.getURI();
                recordingRef.current = null;

                if (!uri) {
                  Alert.alert('Error', 'Could not retrieve recording path.');
                  setListeningState('idle');
                  return;
                }

                // Choose the specialized email cleanups on the backend if it is the email step
                const endpoint = step === 'email' 
                  ? '/users/auth/voice-login/' 
                  : '/users/auth/voice-process/';

                const formData = new FormData();
                formData.append('audio', {
                  uri: uri,
                  name: 'voice_signup.m4a',
                  type: 'audio/m4a',
                } as any);

                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                  method: 'POST',
                  headers: { 'ngrok-skip-browser-warning': 'true' },
                  body: formData,
                });

                if (response.ok) {
                  const data = await response.json();
                  const resultText = step === 'email' ? data.email : data.text;
                  handleStepResponse(step, resultText);
                } else {
                  Speech.speak("I didn't catch that. Let's try this step again.");
                  setTimeout(() => {
                    startVoiceSignupStep(step);
                  }, 2000);
                }
              } catch (error: any) {
                console.error('Error in step recording loop:', error);
                setListeningState('idle');
              }
            }, durationMs);
          } catch (error: any) {
            console.error('Failed to initialize step recording:', error);
            setListeningState('idle');
          }
        })();
      },
      onError: (error) => {
        console.error('Speech error:', error);
        setListeningState('idle');
      },
    });
  };

  // Process transcription and transition state step-by-step
  const handleStepResponse = (step: 'role' | 'fullName' | 'email' | 'phone', text: string) => {
    if (!text || text.trim() === '') {
      Speech.speak("I didn't hear anything. Let's try this step again.");
      setTimeout(() => startVoiceSignupStep(step), 2000);
      return;
    }

    const cleanText = text.trim();

    if (step === 'role') {
      let selectedRole = '';
      let roleLabel = '';
      const lower = cleanText.toLowerCase();

      if (lower.includes('1') || lower.includes('one') || lower.includes('visual')) {
        selectedRole = 'visually_impaired';
        roleLabel = 'Visually Impaired';
      } else if (lower.includes('2') || lower.includes('two') || lower.includes('child')) {
        selectedRole = 'child';
        roleLabel = 'Child';
      } else if (lower.includes('3') || lower.includes('three') || lower.includes('parent')) {
        selectedRole = 'parent';
        roleLabel = 'Parent';
      } else if (lower.includes('4') || lower.includes('four') || lower.includes('admin')) {
        selectedRole = 'admin';
        roleLabel = 'Admin';
      }

      if (selectedRole) {
        setRole(selectedRole);
        Speech.speak(`${roleLabel} selected.`, {
          onDone: () => {
            // Auto advance
            startVoiceSignupStep('fullName');
          },
        });
      } else {
        Speech.speak("Invalid option. Say 1, 2, 3, or 4. Let's try again.");
        setTimeout(() => startVoiceSignupStep('role'), 2500);
      }
    } else if (step === 'fullName') {
      const parsedName = cleanText
        .replace(/[.,!?;:]+$/, '')
        .toLowerCase()
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(' ');
      setFullName(parsedName);
      setConfirmingName(true);
      setListeningState('speaking');
      Speech.speak(`Did you say ${parsedName}? Say yes or no.`, {
        onDone: () => {
          (async () => {
            try {
              const { status } = await Audio.requestPermissionsAsync();
              if (status !== 'granted') {
                setConfirmingName(false);
                startVoiceSignupStep('email');
                return;
              }
              setListeningState('listening');
              await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
              try { if (recordingRef.current) await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
              recordingRef.current = new Audio.Recording();
              await recordingRef.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
              await recordingRef.current.startAsync();
              setTimeout(async () => {
                try {
                  setListeningState('transcribing');
                  await recordingRef.current?.stopAndUnloadAsync();
                  const uri = recordingRef.current?.getURI();
                  recordingRef.current = null;
                  setConfirmingName(false);
                  if (!uri) { startVoiceSignupStep('email'); return; }
                  const formData = new FormData();
                  formData.append('audio', { uri, name: 'confirm.m4a', type: 'audio/m4a' } as any);
                  const res = await fetch(`${API_BASE_URL}/users/auth/voice-process/`, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' }, body: formData });
                  if (res.ok) {
                    const data = await res.json();
                    const reply = (data.text || '').toLowerCase();
                    if (/ye(st|ah)?|correc|right|that's right|yes/.test(reply)) {
                      startVoiceSignupStep('email');
                    } else if (/no|nope|nah|incorrect|wrong|try again|retry/.test(reply)) {
                      Speech.speak("Let's try your name again.");
                      setTimeout(() => startVoiceSignupStep('fullName'), 1500);
                    } else {
                      startVoiceSignupStep('email');
                    }
                  } else {
                    startVoiceSignupStep('email');
                  }
                } catch (_) { setConfirmingName(false); startVoiceSignupStep('email'); }
              }, 3000);
            } catch (_) { setConfirmingName(false); startVoiceSignupStep('email'); }
          })();
        },
      });
    } else if (step === 'email') {
      const parsedEmail = parseSpokenNumbers(cleanText)
        .toLowerCase()
        .replace(/\s*ad\s*/g, '@')
        .replace(/\s*at\s*/g, '@')
        .replace(/\s*dot\s*/g, '.')
        .replace(/[^a-z0-9@._-]/g, '')
        .replace(/\.@|@\./g, '@');

      if (!parsedEmail.includes('@') || parsedEmail.startsWith('@') || parsedEmail.endsWith('@')) {
        Speech.speak(`I heard ${parsedEmail || 'nothing'}, which doesn't look valid. Let's try again.`);
        setTimeout(() => startVoiceSignupStep('email'), 2000);
        return;
      }

      setEmail(parsedEmail);
      Speech.speak(`Email saved as ${parsedEmail}.`, {
        onDone: () => {
          startVoiceSignupStep('phone');
        },
      });
    } else if (step === 'phone') {
      const parsedDigits = parseSpokenNumbers(cleanText).replace(/\D/g, '');
      setPhone(parsedDigits || cleanText);
      setCurrentStep('done');
      setListeningState('idle');
      Speech.speak('Phone number saved. Please review your details and click Create Account when ready.');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      startVoiceSignupStep('role');
    } else {
      setLastTap(now);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all details');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms', 'You must agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      const pushRegistration = await registerForPushNotifications();
      const { response, data, url } = await apiPost(
        '/users/register/',
        {
          full_name: fullName,
          email,
          password,
          phone_number: phone,
          role,
          ...buildPushTokenBody(pushRegistration.token),
        },
        false,
      );
      console.log('Sending request to:', url);

      if (response.ok) {
        if (data && typeof data === 'object') {
          const tokenPayload = data as { access?: string; refresh?: string };
          await saveTokens({ access: tokenPayload.access, refresh: tokenPayload.refresh });

          const pushSync = await syncPushTokenToBackend();
          if (!pushSync.success) {
            Alert.alert(
              'Push notifications',
              pushSync.message || 'Could not save device token for calls. Allow notifications in Settings.',
            );
          }
        }
        navigation.navigate('LinkUser');
      } else {
        const apiMessage =
          (data && typeof data === 'object' && ('message' in data || 'detail' in data)
            ? String((data as { message?: string; detail?: string }).message || (data as { detail?: string }).detail)
            : null) ||
          (typeof data === 'string' ? data : null) ||
          'Failed to register account';

        Alert.alert('Registration Failed', apiMessage);
      }
    } catch (error: any) {
      Alert.alert('Connection Error', error?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons name="shield-outline" size={40} color={colors.white} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join SmartAid today</Text>
            </View>

            <View style={styles.card}>
              {listeningState !== 'idle' && (
                <View style={styles.voiceBanner}>
                  <ActivityIndicator size="small" color={colors.info} />
                  <Text style={styles.voiceBannerText}>
                    {listeningState === 'speaking' && 'Speaking...'}
                    {listeningState === 'listening' && `Listening (${getStepDurationSeconds(currentStep)})...`}
                    {listeningState === 'transcribing' && 'Transcribing voice...'}
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Select Your Role</Text>
              
              <View style={styles.roleGrid}>
                {roles.map((item) => {
                  const isActiveRole = role === item.id;
                  const isHighlightStep = currentStep === 'role';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.roleBox,
                        isActiveRole && styles.roleBoxActive,
                        isHighlightStep && styles.roleBoxHighlighted,
                      ]}
                      onPress={() => setRole(item.id)}
                      accessibilityLabel={`${item.label} role`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isActiveRole }}
                    >
                      <View style={[
                          styles.iconCircle,
                          isActiveRole && styles.iconCircleActive,
                      ]}>
                          <Ionicons 
                            name={item.icon as any} 
                            size={22} 
                            color={isActiveRole ? colors.primary : colors.textSecondary} 
                          />
                      </View>
                      <Text 
                        numberOfLines={1} 
                        style={[styles.roleLabel, isActiveRole && styles.roleLabelActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                ref={nameInputRef}
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder={currentStep === 'fullName' && listeningState === 'listening' ? 'Listening...' : 'Enter your name'}
                icon={<Ionicons name="person-outline" size={20} color={colors.textPrimary} />}
                autoCapitalize="words"
                editable={listeningState === 'idle'}
                style={currentStep === 'fullName' ? styles.highlightedInput : undefined}
              />
              
              <Input
                ref={emailInputRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder={currentStep === 'email' && listeningState === 'listening' ? 'Listening...' : 'Enter your email'}
                icon={<Ionicons name="mail-outline" size={20} color={colors.textPrimary} />}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={listeningState === 'idle'}
                style={currentStep === 'email' ? styles.highlightedInput : undefined}
              />

              <Input
                ref={phoneInputRef}
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder={currentStep === 'phone' && listeningState === 'listening' ? 'Listening...' : '01xxxxxxxxx'}
                icon={<Ionicons name="call-outline" size={20} color={colors.textPrimary} />}
                keyboardType="phone-pad"
                editable={listeningState === 'idle'}
                style={currentStep === 'phone' ? styles.highlightedInput : undefined}
              />

              <Input
                ref={passwordInputRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                }
                editable={listeningState === 'idle'}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
                accessibilityLabel={agreed ? 'Terms agreed' : 'Agree to terms'}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.link}>Terms of Service</Text>
                </Text>
              </TouchableOpacity>

              <Button
                title="Create Account"
                onPress={handleRegister}
                style={styles.createBtn}
                loading={loading}
                disabled={!agreed || loading || listeningState !== 'idle'}
                accessibilityLabel="Create account"
              />
            </View>

            <TouchableOpacity style={styles.footer} onPress={() => navigation.goBack()} accessibilityLabel="Go to login" accessibilityRole="link">
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.link}>Login</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.tipContainer}>
              <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.tipText}>Double-tap anywhere to sign up using voice navigation</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  roleBox: {
    width: '48%', 
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  roleBoxActive: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  roleBoxHighlighted: {
    borderColor: colors.info,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconCircleActive: {
    backgroundColor: '#E8EFFF',
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleLabelActive: {
    color: colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  link: {
    color: colors.info,
    fontWeight: '600',
  },
  createBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  voiceBannerText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '600',
  },
  highlightedInput: {
    borderWidth: 2,
    borderColor: colors.info,
    borderRadius: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
