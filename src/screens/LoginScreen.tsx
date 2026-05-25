import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPushTokenBody,
  registerForPushNotifications,
  syncPushTokenToBackend,
} from '../services/notificationService';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Show/Hide password toggle state
  
  // Voice navigation state
  const [listeningState, setListeningState] = useState<'idle' | 'speaking' | 'listening' | 'transcribing'>('idle');
  const [lastTap, setLastTap] = useState<number | null>(null);

  // Refs for focusing inputs programmatically
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null); // Active recording tracker

  const startVoiceLogin = async () => {
    try {
      setListeningState('speaking');
      // Speak "Say your email." to the user first.
      Speech.speak('Say your email.', {
        onDone: () => {
          (async () => {
            try {
              // Immediately focus on the Email input
              emailInputRef.current?.focus();

              // Request microphone permissions
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

              // Clean up any stale active recording to prevent "Only one Recording object can be prepared" error
              if (recordingRef.current) {
                try {
                  await recordingRef.current.stopAndUnloadAsync();
                } catch (e) {}
                recordingRef.current = null;
              }

              const recording = new Audio.Recording();
              recordingRef.current = recording;

              await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
              await recording.startAsync();

              // Record for exactly 5 seconds
              setTimeout(async () => {
                try {
                  setListeningState('transcribing');
                  await recording.stopAndUnloadAsync();
                  recordingRef.current = null;
                  const uri = recording.getURI();

                  if (!uri) {
                    Alert.alert('Error', 'Could not retrieve recording path.');
                    setListeningState('idle');
                    return;
                  }

                  // Prepare multipart/form-data payload
                  const formData = new FormData();
                  formData.append('audio', {
                    uri: uri,
                    name: 'voice_login.m4a',
                    type: 'audio/m4a',
                  } as any);

                  // Send the local audio URI to Django backend
                  const response = await fetch(`${API_BASE_URL}/users/auth/voice-login/`, {
                    method: 'POST',
                    headers: { 'ngrok-skip-browser-warning': 'true' },
                    body: formData,
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data && data.email) {
                      // Clean up and set email address
                      const transcribedEmail = data.email.trim();
                      setEmail(transcribedEmail);
                      
                      // Announce transcription success
                      Speech.speak('Email captured.');

                      // Move focus to password input
                      setTimeout(() => {
                        passwordInputRef.current?.focus();
                      }, 500);
                    } else {
                      Alert.alert('Transcription Failed', 'No valid email was detected.');
                    }
                  } else {
                    Alert.alert('Server Error', 'Failed to transcribe email.');
                  }
                } catch (error: any) {
                  console.error('Error during recording process:', error);
                  Alert.alert('Error', error.message || 'An error occurred during voice login.');
                } finally {
                  setListeningState('idle');
                }
              }, 5000);
            } catch (error: any) {
              console.error('Failed to initialize recording:', error);
              Alert.alert('Error', 'Failed to initialize audio recording.');
              setListeningState('idle');
            }
          })();
        },
        onError: (error) => {
          console.error('Speech synthesis error:', error);
          setListeningState('idle');
        },
      });
    } catch (error: any) {
      console.error('Failed to start voice flow:', error);
      setListeningState('idle');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      startVoiceLogin();
    } else {
      setLastTap(now);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const pushRegistration = await registerForPushNotifications();
      const { response, data, url } = await apiPost(
        '/users/login/',
        {
          email,
          password,
          ...buildPushTokenBody(pushRegistration.token),
        },
        false,
      );
      console.log('Sending request to:', url);

      if (response.ok) {
        if (data && typeof data === 'object') {
          const tokenPayload = data as { access?: string; refresh?: string };
          await saveTokens({ access: tokenPayload.access, refresh: tokenPayload.refresh });
          await AsyncStorage.setItem('user_profile', JSON.stringify(data));

          // Sync push token to backend (native FCM for firebase_admin)
          const pushSync = await syncPushTokenToBackend();
          if (!pushSync.success) {
            console.warn('[Login] Push token sync failed:', pushSync.message);
          }
        }
        navigation.replace('Home');
        return;
      }

      const apiMessage =
        (data && typeof data === 'object' && ('message' in data || 'detail' in data)
          ? String((data as { message?: string; detail?: string }).message || (data as { detail?: string }).detail)
          : null) ||
        (typeof data === 'string' ? data : null) ||
        'Login failed';

      Alert.alert('Sign In Failed', apiMessage);
    } catch (error: any) {
      Alert.alert('Connection Error', error?.message || 'Network request failed');
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
              <Text style={styles.appName}>SmartAid</Text>
              <Text style={styles.tagline}>AI-Powered Assistance</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.welcome}>Welcome Back</Text>
              <Text style={styles.subWelcome}>Sign in to continue</Text>

              {listeningState !== 'idle' && (
                <View style={styles.voiceBanner}>
                  <ActivityIndicator size="small" color={colors.info} />
                  <Text style={styles.voiceBannerText}>
                    {listeningState === 'speaking' && 'Speaking...'}
                    {listeningState === 'listening' && 'Listening (5s remaining)...'}
                    {listeningState === 'transcribing' && 'Transcribing audio...'}
                  </Text>
                </View>
              )}

              <Input
                ref={emailInputRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder={listeningState === 'listening' ? 'Listening...' : 'Enter your email'}
                icon={<Ionicons name="mail-outline" size={20} color={colors.textPrimary} />}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={listeningState === 'idle'}
              />
              <Input
                ref={passwordInputRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={22} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => {}}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleSignIn}
                style={styles.signInBtn}
                disabled={loading || listeningState !== 'idle'}
              />
            </View>

            <TouchableOpacity
              style={styles.createAccountLink}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.createAccountText}>
                Don't have an account? <Text style={styles.createAccountBold}>Create Account</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.tipContainer}>
              <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.tipText}>Double-tap anywhere to login using voice navigation</Text>
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
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subWelcome: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '500',
  },
  signInBtn: {
    width: '100%',
  },
  createAccountLink: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  createAccountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  createAccountBold: {
    color: colors.primary,
    fontWeight: '600',
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
