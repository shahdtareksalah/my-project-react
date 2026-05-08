import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { OsmLeafletMap } from '../components/OsmLeafletMap';
import { colors } from '../theme/colors';
import { apiPost } from '../api/client';
import { useSafety } from '../context/SafetyContext';
import { normalizeCoordinate } from '../utils/locationNormalizers';

const DEFAULT_CENTER = { latitude: 30.0444, longitude: 31.2357 };
const MIN_RADIUS = 100;
const MAX_RADIUS = 2000;

export function CreateSafeZoneScreen({ navigation, route }: any) {
  const dependentId = String(route?.params?.dependentId ?? '').trim();
  const dependentName = String(route?.params?.dependentName ?? 'Child').trim();
  const editMode = Boolean(route?.params?.editMode);
  const zoneId = String(route?.params?.zoneId ?? '').trim();
  const initialPoint = normalizeCoordinate(route?.params?.selectedPoint);
  const initialRadius = Number(route?.params?.radius);
  const [zoneName, setZoneName] = useState(String(route?.params?.zoneName ?? ''));
  const [radius, setRadius] = useState(
    Number.isFinite(initialRadius) && initialRadius >= MIN_RADIUS && initialRadius <= MAX_RADIUS
      ? initialRadius
      : 400
  );
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(initialPoint);
  const [saving, setSaving] = useState(false);
  const { updateSafeZone, fetchSafeZones } = useSafety();

  const mapCenter = selectedPoint ?? DEFAULT_CENTER;
  const mapSafeZones = useMemo(
    () =>
      selectedPoint
        ? [
          {
            id: 'new-zone',
            latitude: selectedPoint.latitude,
            longitude: selectedPoint.longitude,
            radius,
            name: zoneName.trim() || 'New Safe Zone',
          },
        ]
        : [],
    [radius, selectedPoint, zoneName]
  );

  const handleSaveSafeZone = async () => {
    if (!dependentId) {
      Alert.alert('Missing Child', 'No dependent was provided for this safe zone.');
      return;
    }
    if (!selectedPoint) {
      Alert.alert('Select Location', 'Long press on the map to place a safe zone center.');
      return;
    }
    const trimmedZoneName = zoneName.trim();
    if (!trimmedZoneName) {
      Alert.alert('Missing Name', 'Please enter a safe zone name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dependent_id: String(dependentId),
        zone_name: String(trimmedZoneName),
        lng: Number(selectedPoint.longitude),
        lat: Number(selectedPoint.latitude),
        radius: Number(radius),
      };
      if (editMode) {
        if (!zoneId) {
          throw new Error('Missing safe zone id for update');
        }
        await updateSafeZone(zoneId, payload);
        await fetchSafeZones(dependentId); // sync context before going back
        Alert.alert('Success', 'Safe zone updated successfully.');
        navigation.goBack();
        return;
      }

      const { response, data } = await apiPost('/locations/safezone/', payload);
      if (response.ok) {
        await fetchSafeZones(dependentId); // sync context before going back
        Alert.alert('Success', 'Safe zone created successfully.');
        navigation.goBack();
        return;
      }
      const message =
        (data && typeof data === 'object'
          ? ((data as { message?: string; detail?: string }).message ||
            (data as { detail?: string }).detail)
          : null) ||
        (typeof data === 'string' ? data : null) ||
        'Failed to create safe zone';
      Alert.alert('Save Failed', String(message));
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Unable to save safe zone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapContainer}>
        <OsmLeafletMap
          center={mapCenter}
          zoom={selectedPoint ? 13 : 11}
          marker={selectedPoint}
          safeZones={mapSafeZones}
          onPress={(point) => setSelectedPoint(point)}
        />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.floatingCard}>
          <Text style={styles.title}>{editMode ? 'Update Safe Zone' : 'Create Safe Zone'}</Text>
          <Text style={styles.subtitle}>Child: {dependentName}</Text>

          <TextInput
            style={styles.input}
            value={zoneName}
            onChangeText={setZoneName}
            placeholder="Zone name (e.g. Home)"
            placeholderTextColor={colors.textLight}
          />

          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Radius</Text>
            <Text style={styles.sliderValue}>{Math.round(radius)}m</Text>
          </View>
          <Slider
            minimumValue={MIN_RADIUS}
            maximumValue={MAX_RADIUS}
            step={10}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Text style={styles.hint}>Tap on the map to place the zone center.</Text>

          <Button
            title={editMode ? 'Update Safe Zone' : 'Save Safe Zone'}
            onPress={handleSaveSafeZone}
            loading={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDark },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sliderHeader: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  sliderValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
});
