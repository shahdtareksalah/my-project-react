import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { apiPost, saveTokens } from '../api/client';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { response, data, url } = await apiPost('/users/login/', {
        email,
        password,
      }, false);
      console.log('Sending request to:', url);

      if (response.ok) {
        if (data && typeof data === 'object') {
          const tokenPayload = data as { access?: string; refresh?: string };
          await saveTokens({ access: tokenPayload.access, refresh: tokenPayload.refresh });
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

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              icon={<Ionicons name="mail-outline" size={20} color={colors.textPrimary} />}
              keyboardType="email-address"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />}
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
              disabled={loading}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  createAccountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  createAccountBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
