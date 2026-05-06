import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Input } from '../components/Input';
import { useSafety } from '../context/SafetyContext';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> };

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rowStyles.iconBg}>{icon}</View>
      <View style={rowStyles.text}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textLight, marginTop: 2 },
});

export function SettingsScreen({ navigation }: Props) {
  const { emergencyPhone, setEmergencyPhone, setSafeZoneFromCurrentLocation, requestLocationPermissions, safeZone } =
    useSafety();
  const [phoneDraft, setPhoneDraft] = useState(emergencyPhone);
  const [zoneName, setZoneName] = useState(safeZone?.name ?? 'Home');
  const [radiusMeters, setRadiusMeters] = useState(String(safeZone?.radiusMeters ?? 400));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage your account and preferences</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          <Ionicons name="shield-outline" size={18} color={colors.textPrimary} /> Dashboards
        </Text>
        <Card>
          <SettingsRow
            icon={<Ionicons name="people-outline" size={22} color={colors.primary} />}
            title="Admin Dashboard"
            subtitle="Manage system and users"
            onPress={() => navigation.navigate('AdminDashboard')}
          />
          <SettingsRow
            icon={<Ionicons name="people-outline" size={22} color={colors.primary} />}
            title="Parents Dashboard"
            subtitle="Monitor children and activities"
            onPress={() => navigation.navigate('ParentDashboard')}
          />
        </Card>

        <Text style={styles.sectionLabel}>Account Settings</Text>
        <Card>
          <Input
            label="Emergency Phone"
            value={phoneDraft}
            onChangeText={setPhoneDraft}
            placeholder="+1 555 0100"
            keyboardType="phone-pad"
          />
          <Button title="Save Emergency Contact" onPress={() => void setEmergencyPhone(phoneDraft)} />
          <SettingsRow
            icon={<Ionicons name="notifications-outline" size={22} color={colors.primary} />}
            title="Notifications"
            subtitle="Manage alert preferences"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Ionicons name="lock-closed-outline" size={22} color={colors.primary} />}
            title="Privacy & Security"
            subtitle="Control your data"
            onPress={() => {}}
          />
        </Card>

        <Text style={styles.sectionLabel}>Safe Zone</Text>
        <Card>
          <Input label="Zone Name" value={zoneName} onChangeText={setZoneName} placeholder="Home / School" />
          <Input
            label="Radius (meters)"
            value={radiusMeters}
            onChangeText={setRadiusMeters}
            placeholder="400"
            keyboardType="numeric"
          />
          <Button
            title="Set Safe Zone From Current Location"
            onPress={async () => {
              const granted = await requestLocationPermissions();
              if (!granted) {
                return;
              }
              const parsedRadius = Number(radiusMeters);
              await setSafeZoneFromCurrentLocation(parsedRadius > 0 ? parsedRadius : 400, zoneName || 'Home');
            }}
          />
          {safeZone && (
            <Text style={styles.version}>
              Active: {safeZone.name} ({safeZone.radiusMeters}m)
            </Text>
          )}
        </Card>

        <Text style={styles.sectionLabel}>Support</Text>
        <Card>
          <SettingsRow
            icon={<Ionicons name="help-circle-outline" size={22} color={colors.primary} />}
            title="Help & Support"
            subtitle="Get assistance"
            onPress={() => {}}
          />
        </Card>

        <Button
          title="Log Out"
          variant="ghost"
          onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            }
          icon={<Ionicons name="log-out-outline" size={22} color={colors.emergency} />}
          style={styles.logoutBtn}
        />

        <Text style={styles.version}>SmartAid Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundDark,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  version: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 24,
  },
});
