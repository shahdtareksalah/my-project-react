import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, InteractionManager, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { OsmLeafletMap } from '../components/OsmLeafletMap';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

const DEFAULT_CENTER = { latitude: 30.0444, longitude: 31.2357 };

// Cleans raw subtitle strings like "email - child - Tracking OFF"
// into structured pieces for nicer rendering
function parseChildSubtitle(subtitle: string | undefined) {
  if (!subtitle) return { email: null, trackingOn: false };
  const parts = subtitle.split(' - ');
  const email = parts[0] ?? null;
  const trackingOn = subtitle.toLowerCase().includes('tracking on');
  return { email, trackingOn };
}

export function ParentDashboardScreen({ navigation }: any) {
  const {
    linkedChildren,
    fetchLinkedChildren,
    safeZones,        // full list – Req 1
    fetchSafeZones,   // called with no childId
  } = useSafety();

  const [focusCenter, setFocusCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [callingChildId, setCallingChildId] = useState<string | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMapReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchLinkedChildren(), fetchSafeZones()]);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load dashboard data');
      }
    };
    void load();
  }, []);

  const children = linkedChildren;

  const childMarkers = useMemo(
    () =>
      children
        .filter((c) =>
          Boolean(c.coordinate && Number.isFinite(c.coordinate.latitude) && Number.isFinite(c.coordinate.longitude)),
        )
        .map((c) => ({
          latitude: c.coordinate!.latitude,
          longitude: c.coordinate!.longitude,
          label: c.displayName,
        })),
    [children],
  );

  // Req 1: pass ALL zones – no filtering on this screen
  const mapSafeZones = useMemo(
    () =>
      safeZones.map((z) => ({
        id: z.id, latitude: z.latitude, longitude: z.longitude,
        radius: z.radius, name: z.name,
      })),
    [safeZones],
  );

  const mapCenter =
    childMarkers[0] ??
    (safeZones.length > 0
      ? { latitude: safeZones[0].latitude, longitude: safeZones[0].longitude }
      : DEFAULT_CENTER);

  const startCall = (childId: string, childName?: string) => {
    setCallingChildId(childId);
    navigation.navigate('AudioCall', {
      childId,
      callerName: childName,
      isIncoming: false,
    });
    setCallingChildId(null);
  };

  const startQuickCall = () => {
    if (children.length === 0) {
      Alert.alert('No Linked Children', 'Link a child account before starting a call.');
      return;
    }

    if (children.length > 1) {
      Alert.alert('Choose a Child', 'Use the call button beside the child you want to call.');
      return;
    }

    void startCall(children[0].id, children[0].displayName);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.welcomeSmall}>Welcome back</Text>
          <Text style={styles.headerTitle}>Parent Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('AlertHistory')}>
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Children Map ── */}
        <View style={styles.mapCard}>
          <View style={styles.mapTitleRow}>
            <Ionicons name="map" size={16} color={colors.primary} />
            <Text style={styles.mapTitle}>Children Map</Text>
            {childMarkers.length > 0 && (
              <View style={styles.onlinePill}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlinePillText}>{childMarkers.length} online</Text>
              </View>
            )}
          </View>
          <View style={styles.mapWrapper}>
            {mapReady ? (
              <OsmLeafletMap
                center={mapCenter}
                zoom={11}
                markers={childMarkers}
                safeZones={mapSafeZones}
                focusCenter={focusCenter}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* ── Children list ── */}
        <Text style={styles.listHeading}>Linked Children</Text>

        {children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No linked children yet</Text>
            <Text style={styles.emptyHint}>Link a child account to start monitoring</Text>
            <Button title="Link Child" onPress={() => navigation.navigate('LinkChild')} style={styles.emptyBtn} />
          </View>
        ) : (
          children.map((child) => {
            const { email, trackingOn } = parseChildSubtitle(child.subtitle);
            return (
              <View key={child.id} style={styles.childCard}>
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>

                {/* Info */}
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.displayName}</Text>
                  {email && <Text style={styles.childEmail} numberOfLines={1}>{email}</Text>}
                  <View style={[styles.trackingTag, trackingOn ? styles.trackingOn : styles.trackingOff]}>
                    <View style={[styles.trackingDot, { backgroundColor: trackingOn ? '#4ADE80' : '#F87171' }]} />
                    <Text style={[styles.trackingText, { color: trackingOn ? '#4ADE80' : '#F87171' }]}>
                      Tracking {trackingOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.childActions}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    disabled={callingChildId === child.id}
                    onPress={() => void startCall(child.id, child.displayName)}
                  >
                    {callingChildId === child.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="call" size={16} color={colors.white} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() =>
                      navigation.navigate('ParentDashboardLocation', {
                        dependentId: child.id,
                        dependentName: child.displayName,
                      })
                    }
                  >
                    <Ionicons name="location-sharp" size={16} color={colors.white} />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── Last Activity Log ── */}
        {children.filter((c) => c.coordinate).length > 0 && (
          <View style={styles.logSection}>
            <Text style={styles.listHeading}>Last Activity Log</Text>
            {children
              .filter((c) => c.coordinate)
              .map((child) => (
                <TouchableOpacity
                  key={`log-${child.id}`}
                  style={styles.logEntry}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (child.coordinate) {
                      // Force a new object reference so useEffect in OsmLeafletMap always fires
                      setFocusCenter({ ...child.coordinate });
                    }
                  }}
                >
                  <View style={styles.logIconWrap}>
                    <Ionicons name="navigate" size={14} color={colors.primary} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>{child.displayName}</Text>
                    <Text style={styles.logCoords}>
                      {child.coordinate!.latitude.toFixed(5)}, {child.coordinate!.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <Ionicons name="locate-outline" size={18} color={colors.textLight} />
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickTile, styles.quickTilePrimary]} onPress={() => navigation.navigate('LinkChild')}>
              <Ionicons name="person-add" size={22} color={colors.white} />
              <Text style={styles.quickTileText}>Link New Child</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickTile, styles.quickTilePrimary]} onPress={startQuickCall}>
              <Ionicons name="call" size={22} color={colors.white} />
              <Text style={styles.quickTileText}>Call Child</Text>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: colors.backgroundDark,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: CARD_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  welcomeSmall: { fontSize: 11, color: colors.textLight },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

  /* Map card */
  mapCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  mapTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  mapTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.white },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(74,222,128,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  onlinePillText: { fontSize: 11, fontWeight: '600', color: '#4ADE80' },
  mapWrapper: { height: 260, borderRadius: 12, overflow: 'hidden' },

  /* Section heading */
  listHeading: {
    fontSize: 13, fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },

  /* Child card */
  childCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1, borderColor: BORDER,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  childInfo: { flex: 1, gap: 3 },
  childName: { fontSize: 15, fontWeight: '700', color: colors.white },
  childEmail: { fontSize: 11, color: colors.textLight },
  trackingTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginTop: 2,
  },
  trackingOn: { backgroundColor: 'rgba(74,222,128,0.1)' },
  trackingOff: { backgroundColor: 'rgba(248,113,113,0.1)' },
  trackingDot: { width: 5, height: 5, borderRadius: 3 },
  trackingText: { fontSize: 11, fontWeight: '600' },
  childActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },

  /* Empty state */
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', gap: 8,
    paddingVertical: 32, paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.white },
  emptyHint: { fontSize: 12, color: colors.textLight, textAlign: 'center' },
  emptyBtn: { marginTop: 8, minWidth: 160 },

  /* Quick Actions */
  quickSection: { gap: 12 },
  quickTitle: {
    fontSize: 13, fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickTile: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
    borderRadius: 14, borderWidth: 1,
  },
  quickTilePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickTileText: { fontSize: 12, fontWeight: '700', color: colors.white },

  /* Last Activity Log */
  logSection: { gap: 8 },
  logEntry: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: BORDER,
    gap: 10,
  },
  logIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  logInfo: { flex: 1, gap: 2 },
  logName: { fontSize: 13, fontWeight: '600', color: colors.white },
  logCoords: { fontSize: 11, color: colors.textLight, fontVariant: ['tabular-nums'] as any },
});
