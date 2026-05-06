import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

export function ParentDashboardScreen({ navigation }: any) {
  const [safeZoneName, setSafeZoneName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [childIdentifier, setChildIdentifier] = useState('');
  const [linking, setLinking] = useState(false);
  const { linkChild } = useSafety();

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
          <Text style={styles.welcomeSmall}>Welcome back</Text>
          <Text style={styles.headerTitle}>Parent Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.childRow}>
            <View style={styles.childAvatar}>
              <Ionicons name="person-outline" size={28} color={colors.textPrimary} />
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>Ahmed Ali</Text>
              <Text style={styles.childAge}>Age: 8 years old</Text>
            </View>
            <View style={styles.togglePlaceholder} />
          </View>
        </Card>

        <Card>
          <Input
            label=""
            value={safeZoneName}
            onChangeText={setSafeZoneName}
            placeholder="Enter safe zone name"
          />
          <Input
            label="Emergency Contact"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            placeholder="+1 (555) 000-0000"
            icon={<Ionicons name="call-outline" size={20} color={colors.textPrimary} />}
            keyboardType="phone-pad"
          />
          <Input
            label="Dependent/Child ID"
            value={childIdentifier}
            onChangeText={setChildIdentifier}
            placeholder="Enter child_id"
          />
          <Button
            title="Add Dependent"
            loading={linking}
            onPress={async () => {
              if (!childIdentifier.trim()) return;
              setLinking(true);
              try {
                await linkChild(childIdentifier.trim());
              } finally {
                setLinking(false);
              }
            }}
          />
        </Card>

        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <Button
            title="Call Child"
            onPress={() => {}}
            icon={<Ionicons name="call-outline" size={22} color={colors.white} />}
            style={styles.quickBtn}
          />
          <Button
            title="View Full Map"
            variant="outline"
            onPress={() => navigation.navigate('ParentDashboardLocation')}
            icon={<Ionicons name="location-outline" size={22} color={colors.textPrimary} />}
            style={styles.quickBtn}
          />
        </View>
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
    borderRadius: 12,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeSmall: {
    fontSize: 12,
    color: colors.textLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  childInfo: { flex: 1 },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  childAge: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  togglePlaceholder: {
    width: 52,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  quickBtn: {
    width: '100%',
    marginBottom: 12,
  },
});
