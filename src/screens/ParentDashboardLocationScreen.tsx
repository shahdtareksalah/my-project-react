import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';
import type { NormalizedSafeZone } from '../utils/locationNormalizers';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type RootStackParamList = {
  ParentDashboardLocation: { dependentId: string; dependentName: string };
  CreateSafeZone: {
    dependentId: string;
    dependentName: string;
    editMode?: boolean;
    zoneId?: string;
    zoneName?: string;
    radius?: number;
    selectedPoint?: { latitude: number; longitude: number };
  };
};
type Props = NativeStackScreenProps<RootStackParamList, 'ParentDashboardLocation'>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ParentDashboardLocationScreen({ navigation, route }: Props) {
  const { dependentId = '', dependentName = 'Unknown' } = route.params ?? {};
  const [isLoadingZones, setIsLoadingZones] = useState(false);

  // Keep a stable local copy of zones – only reset when switching to a DIFFERENT user
  // so returning from CreateSafeZone never flashes an empty list
  const [displayedZones, setDisplayedZones] = useState<NormalizedSafeZone[]>([]);
  const lastFetchedIdRef = useRef<string>('');
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_THROTTLE_MS = 10_000;

  const {
    safeZones,
    deleteSafeZone,
    fetchSafeZones,
  } = useSafety();

  // Sync displayedZones from context – filter to this user only
  useEffect(() => {
    const userZones = safeZones.filter(
      (z) => !z.dependentId || String(z.dependentId) === String(dependentId),
    );
    setDisplayedZones(userZones);
  }, [safeZones, dependentId]);

  // Fetch safe zones for this user on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const now = Date.now();
      const sameUser = lastFetchedIdRef.current === dependentId;
      const fresh = now - lastFetchTimeRef.current < FETCH_THROTTLE_MS;

      // Clear stale zones immediately only when switching to a different user
      if (!sameUser) {
        setDisplayedZones([]);
      }

      // Skip full re-fetch if we just fetched this user recently
      if (sameUser && fresh) return;

      lastFetchedIdRef.current = dependentId;
      lastFetchTimeRef.current = now;

      setIsLoadingZones(true);

      const runFetch = async () => {
        try {
          await fetchSafeZones(dependentId);
        } finally {
          if (!cancelled) setIsLoadingZones(false);
        }
      };
      void runFetch();

      return () => { cancelled = true; };
    }, [dependentId, fetchSafeZones]),
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleDeleteZone = useCallback(
    async (zoneId: string) => {
      Alert.alert('Delete Safe Zone', 'Are you sure you want to remove this safe zone?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteSafeZone(zoneId); }
            catch (e: any) { Alert.alert('Error', e?.message || 'Failed to delete safe zone'); }
          },
        },
      ]);
    },
    [deleteSafeZone],
  );

  const handleNavigateToCreate = useCallback(
    () => navigation.navigate('CreateSafeZone', { dependentId, dependentName }),
    [navigation, dependentId, dependentName],
  );

  const handleNavigateToEdit = useCallback(
    (zone: NormalizedSafeZone) =>
      navigation.navigate('CreateSafeZone', {
        dependentId, dependentName, editMode: true,
        zoneId: zone.id, zoneName: zone.name, radius: zone.radius,
        selectedPoint: { latitude: zone.latitude, longitude: zone.longitude },
      }),
    [navigation, dependentId, dependentName],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>{dependentName}</Text>
          <Text style={styles.headerSubtitle}>Safe Zone Management</Text>
        </View>

        <View style={styles.headerButton}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



        {/* ── Safe Zones Card ── */}
        <View style={styles.sectionCard}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="shield" size={16} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Safe Zones</Text>
            <Text style={styles.zoneBadgeCount}>{displayedZones.length}</Text>
          </View>

          <Button title="+ Create Safe Zone" onPress={handleNavigateToCreate} style={styles.createBtn} />

          {isLoadingZones ? (
            <View style={styles.emptyZones}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.emptyZonesHint}>Loading safe zones…</Text>
            </View>
          ) : displayedZones.length === 0 ? (
            <View style={styles.emptyZones}>
              <Ionicons name="map-outline" size={36} color={colors.textLight} />
              <Text style={styles.emptyZonesText}>No safe zones set up yet</Text>
              <Text style={styles.emptyZonesHint}>Tap the button above to add one</Text>
            </View>
          ) : (
            displayedZones.map((zone) => (
              <View key={zone.id} style={styles.zoneRow}>
                <View style={styles.zoneIconWrap}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  {Number.isFinite(zone.radius) && zone.radius > 0 && (
                    <Text style={styles.zoneRadius}>{zone.radius} m radius</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleNavigateToEdit(zone)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.white} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => void handleDeleteZone(zone.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.white} />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CARD_BG = '#1E2A3A';
const BORDER = '#2E3E52';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.backgroundDark,
    gap: 10,
  },
  headerButton: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: CARD_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 12, color: colors.textLight, marginTop: 1 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },



  /* Section card */
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 14,
  },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.white },
  zoneBadgeCount: {
    minWidth: 22, height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.2)',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12, fontWeight: '700',
    color: '#93C5FD',
    paddingHorizontal: 4,
  },

  createBtn: { marginBottom: 16 },

  /* Empty state */
  emptyZones: {
    alignItems: 'center', gap: 6,
    paddingVertical: 28,
  },
  emptyZonesText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  emptyZonesHint: { fontSize: 12, color: colors.textLight, opacity: 0.6 },

  /* Zone row */
  zoneRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    marginTop: 8,
  },
  zoneIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 13, fontWeight: '600', color: colors.white },
  zoneRadius: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  /* Action buttons */
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: colors.white },
});