import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

export function ChildLocationScreen({ navigation }: any) {
  const { sendEmergency, safeZone, updateChildLocation } = useSafety();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Location</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="shield-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.safeRow}>
          <View style={styles.safeDot} />
          <Text style={styles.safeText}>Safe</Text>
        </View>
        <View style={styles.updatedRow}>
          <Ionicons name="location-outline" size={16} color={colors.white} />
          <Text style={styles.updatedText}>Updated 2 min ago</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapPlaceholder}>
          <View style={styles.dottedCircle} />
          <View style={styles.childCard}>
            <Text style={styles.childCardLabel}>SAFE ZONE</Text>
            <Text style={styles.childCardName}>Ahmed Ali</Text>
            <Text style={styles.childCardAge}>Age: 8 years</Text>
          </View>
          <View style={[styles.poiCard, styles.poiLeft]}>
            <Ionicons name="home-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.poiText}>Home</Text>
          </View>
          <View style={[styles.poiCard, styles.poiRight]}>
            <Ionicons name="school-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.poiText}>School</Text>
          </View>
          <View style={styles.mapPin}>
            <Ionicons name="location" size={32} color={colors.primary} />
          </View>
        </View>

        <Card style={styles.locationDetailCard}>
          <View style={styles.locationDetailRow}>
            <Ionicons name="location" size={24} color={colors.primary} />
            <View style={styles.locationDetailText}>
              <Text style={styles.locationName}>Al-Mansour School</Text>
              <Text style={styles.locationSub}>
                Inside safe zone ({safeZone?.radiusMeters ?? 450}m radius)
              </Text>
            </View>
            <Ionicons name="shield-outline" size={24} color={colors.textLight} />
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Update My Location"
            onPress={() => void updateChildLocation()}
            icon={<Ionicons name="navigate-outline" size={22} color={colors.white} />}
            style={styles.actionBtn}
          />
          <Button
            title="Call Child"
            onPress={() => {}}
            icon={<Ionicons name="call-outline" size={22} color={colors.white} />}
            style={styles.actionBtn}
          />
          <Button
            title="Send Alert"
            variant="danger"
            onPress={() => void sendEmergency('manual')}
            icon={<Ionicons name="notifications-outline" size={22} color={colors.white} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primaryDark,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.cardDark,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.safeZone,
  },
  safeText: { fontSize: 14, color: colors.white, fontWeight: '600' },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updatedText: { fontSize: 12, color: colors.textLight },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  mapPlaceholder: {
    height: 280,
    backgroundColor: colors.cardLight,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.textPrimary,
  },
  childCard: {
    position: 'absolute',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  childCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  childCardName: { fontSize: 14, fontWeight: '700', color: colors.white },
  childCardAge: { fontSize: 12, color: colors.textLight },
  poiCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  poiLeft: { left: 24, top: 80 },
  poiRight: { right: 24, top: 80 },
  poiText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  mapPin: {
    position: 'absolute',
    bottom: 40,
  },
  locationDetailCard: {
    marginTop: 16,
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDetailText: { flex: 1 },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    width: '100%',
  },
});
