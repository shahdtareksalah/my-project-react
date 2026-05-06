import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

export function EmergencyContactScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const { setEmergencyPhone } = useSafety();

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
            <View style={styles.iconBox}>
              <Ionicons name="shield-outline" size={36} color={colors.white} />
            </View>
            <Text style={styles.title}>Emergency Contact Setup</Text>
            <Text style={styles.subtitle}>
              Add a trusted person who will be contacted when an emergency is triggered.
            </Text>
          </View>

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            icon={<Ionicons name="person-outline" size={20} color={colors.textPrimary} />}
          />
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            icon={<Ionicons name="call-outline" size={20} color={colors.textPrimary} />}
            keyboardType="phone-pad"
          />
          <Input
            label="Relationship"
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g., Mother, Father, Spouse, Friend"
            icon={<Ionicons name="heart-outline" size={20} color={colors.textPrimary} />}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.infoText}>
              This contact will receive calls and alerts during emergencies.
            </Text>
          </View>

          <Button
            title="Save Contact"
            onPress={async () => {
              await setEmergencyPhone(phone);
              navigation.replace('Home');
            }}
            style={styles.saveBtn}
          />
          <Button
            title="Skip for now"
            variant="outline"
            onPress={() => navigation.replace('Home')}
            style={styles.skipBtn}
          />
          <Text style={styles.footer}>You can update this information later in Settings</Text>
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
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveBtn: {
    width: '100%',
    marginBottom: 12,
  },
  skipBtn: {
    width: '100%',
    marginBottom: 16,
  },
  footer: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
});
