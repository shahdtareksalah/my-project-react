import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

export function ParentDashboardLocationScreen({ navigation }: any) {
  const [childId, setChildId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('400');
  const {
    childLocation,
    safeZones,
    fetchChildLocation,
    setSafeZoneFromCurrentLocation,
    deleteSafeZone,
    fetchSafeZones,
  } = useSafety();

  useEffect(() => {
    void fetchSafeZones();
  }, [fetchSafeZones]);

  const locationLabel = useMemo(() => {
    if (!childLocation) return 'No location loaded';
    const lat = childLocation.latitude ?? childLocation.lat ?? '--';
    const lng = childLocation.longitude ?? childLocation.lng ?? '--';
    return `Lat: ${lat}, Lng: ${lng}`;
  }, [childLocation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Last Known Location</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color={colors.textLight} />
          <Text style={styles.timeText}>1 min ago</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapPin}>
              <Ionicons name="location" size={40} color={colors.primary} />
            </View>
            <View style={styles.safeZoneBadge}>
              <Text style={styles.safeZoneText}>In Safe Zone</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Safe Zone Settings</Text>
          </View>
          <Input
            label="Child ID"
            value={childId}
            onChangeText={setChildId}
            placeholder="Enter child_id"
          />
          <Button
            title="Load Child Location"
            onPress={async () => {
              if (!childId.trim()) return;
              try {
                await fetchChildLocation(childId.trim());
              } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to load child location');
              }
            }}
          />
          <Input
            label="Safe Zone Name"
            value={zoneName}
            onChangeText={setZoneName}
            placeholder="Enter safe zone name"
          />
          <Input
            label="Radius (meters)"
            value={radiusMeters}
            onChangeText={setRadiusMeters}
            keyboardType="numeric"
            placeholder="400"
          />
          <Button
            title="Create Safe Zone"
            onPress={async () => {
              try {
                await setSafeZoneFromCurrentLocation(Number(radiusMeters) || 400, zoneName || 'Home');
              } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to create safe zone');
              }
            }}
          />
          {safeZones.map((zone, index) => {
            const id = String(zone.id ?? zone.zone_id ?? index);
            const name = String(zone.name ?? `Zone ${index + 1}`);
            return (
              <View key={id} style={styles.zoneRow}>
                <Text style={styles.zoneName}>{name}</Text>
                <TouchableOpacity onPress={() => void deleteSafeZone(id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.emergency} />
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
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
    paddingVertical: 16,
    backgroundColor: colors.backgroundDark,
    gap: 12,
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: { fontSize: 13, color: colors.textLight },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  mapPlaceholder: {
    height: 220,
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: {
    marginBottom: 8,
  },
  safeZoneBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: colors.safeZone,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white,
  },
  safeZoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoneRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  zoneName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
