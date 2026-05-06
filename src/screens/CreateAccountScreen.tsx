import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { apiPost, saveTokens } from '../api/client';

export function CreateAccountScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [role, setRole] = useState('visually_impaired'); 

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'visually_impaired', label: 'Visually Impaired', icon: 'eye-off-outline' },
    { id: 'child', label: 'Child', icon: 'happy-outline' },
    { id: 'parent', label: 'Parent', icon: 'people-outline' },
    { id: 'admin', label: 'Admin', icon: 'shield-checkmark-outline' },
  ];

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('خطأ', 'برجاء ملء جميع البيانات');
      return;
    }
    if (!agreed) {
      Alert.alert('تنبيه', 'يجب الموافقة على الشروط');
      return;
    }

    setLoading(true);
    try {
      const { response, data, url } = await apiPost('/users/register/', {
        full_name: fullName,
        email,
        password,
        phone_number: phone,
        role,
      }, false);
      console.log('Sending request to:', url);

      if (response.ok) {
        if (data && typeof data === 'object') {
          const tokenPayload = data as { access?: string; refresh?: string };
          await saveTokens({ access: tokenPayload.access, refresh: tokenPayload.refresh });
        }
        if (role === 'parent') {
          navigation.navigate('LinkChild');
        } else {
          navigation.navigate('EmergencyContact');
        }
      } else {
        const apiMessage =
          (data && typeof data === 'object' && ('message' in data || 'detail' in data)
            ? String((data as { message?: string; detail?: string }).message || (data as { detail?: string }).detail)
            : null) ||
          (typeof data === 'string' ? data : null) ||
          'حدث خطأ في التسجيل';

        Alert.alert('فشل التسجيل', apiMessage);
      }
    } catch (error: any) {
      Alert.alert('خطأ في الاتصال', error?.message || 'تعذر الاتصال بالخادم');
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
                <Ionicons name="shield-outline" size={40} color={colors.white} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join SmartAid today</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select Your Role</Text>
              
              <View style={styles.roleGrid}>
                {roles.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.roleBox,
                      role === item.id && styles.roleBoxActive
                    ]}
                    onPress={() => setRole(item.id)}
                  >
                    <View style={[
                        styles.iconCircle,
                        role === item.id && styles.iconCircleActive
                    ]}>
                        <Ionicons 
                          name={item.icon as any} 
                          size={22} 
                          color={role === item.id ? colors.primary : colors.textSecondary} 
                        />
                    </View>
                    <Text 
                      numberOfLines={1} 
                      style={[styles.roleLabel, role === item.id && styles.roleLabelActive]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
                icon={<Ionicons name="person-outline" size={20} color={colors.textPrimary} />}
              />
              
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                icon={<Ionicons name="mail-outline" size={20} color={colors.textPrimary} />}
                keyboardType="email-address"
              />

              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="01xxxxxxxxx"
                icon={<Ionicons name="call-outline" size={20} color={colors.textPrimary} />}
                keyboardType="phone-pad"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
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
                disabled={!agreed || loading}
              />
            </View>

            <TouchableOpacity style={styles.footer} onPress={() => navigation.goBack()}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.link}>Login</Text>
              </Text>
            </TouchableOpacity>
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
});