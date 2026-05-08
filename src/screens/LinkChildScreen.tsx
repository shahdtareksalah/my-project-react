import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { apiPost } from '../api/client';
import { colors } from '../theme/colors';

function getApiErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const payload = data as { message?: unknown; detail?: unknown; dependent_email?: unknown };
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (Array.isArray(payload.dependent_email) && payload.dependent_email.length > 0) {
      const firstError = payload.dependent_email[0];
      if (typeof firstError === 'string' && firstError.trim()) return firstError;
    }
  }

  if (typeof data === 'string' && data.trim()) return data;
  return fallback;
}

export function LinkChildScreen({ navigation }: any) {
  const [childEmail, setChildEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const navigateToParentDashboard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ParentDashboard' }],
    });
  };

  const handleLinkChild = async () => {
    const trimmedEmail = childEmail.trim();
    if (!trimmedEmail) {
      Alert.alert('Missing Email', "Please enter your child's email.");
      return;
    }

    setLoading(true);
    try {
      const { response, data } = await apiPost('/locations/link-child/', {
        dependent_email: trimmedEmail,
      });

      if (response.ok) {
        Alert.alert('Success', 'Child linked successfully.');
        navigateToParentDashboard();
        return;
      }

      console.log('[LinkChild] Request failed', {
        status: response.status,
        url: '/locations/link-child/',
        requestBody: { dependent_email: trimmedEmail },
        responseData: data,
      });
      const errorMessage = getApiErrorMessage(
        data,
        'Unable to link child. Please verify the email and try again.'
      );
      Alert.alert('Link Failed', errorMessage);
    } catch (error: any) {
      console.log('[LinkChild] Network/Unexpected error', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      Alert.alert('Network Error', error?.message || 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons name="people-outline" size={32} color={colors.white} />
              </View>
              <Text style={styles.title}>Link Your Child</Text>
              <Text style={styles.subtitle}>
                Add your child's registered email to connect location tracking.
              </Text>
            </View>

            <View style={styles.card}>
              <Input
                label="Child's Email"
                value={childEmail}
                onChangeText={setChildEmail}
                placeholder="example@mail.com"
                keyboardType="email-address"
                icon={<Ionicons name="mail-outline" size={20} color={colors.textPrimary} />}
              />

              <Button title="Link" onPress={handleLinkChild} loading={loading} style={styles.linkButton} />
              <Button
                title="Skip for now"
                onPress={navigateToParentDashboard}
                variant="outline"
                disabled={loading}
              />
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  linkButton: {
    marginTop: 4,
    marginBottom: 12,
  },
});
