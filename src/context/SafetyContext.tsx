import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { triggerEmergencyAlert, type EmergencyTrigger } from '../services/alertService';
import { apiDelete, apiGet, apiPost, API_BASE_URL, getStoredTokens } from '../api/client';
import {
  loadEmergencyContactPhone,
  loadSafeZone,
  saveEmergencyContactPhone,
  saveSafeZone,
  type SafeZone,
} from '../services/safeZoneService';
import {
  normalizeChildLocation,
  normalizeLinkedChildren,
  normalizeSafeZones,
  type Coordinate,
  type NormalizedLinkedChild,
  type NormalizedSafeZone,
} from '../utils/locationNormalizers';

const LOCATION_TASK_NAME = 'smartaid-background-location';

type SafetyContextValue = {
  safeZone: SafeZone | null;
  safeZones: NormalizedSafeZone[];
  linkedChildren: NormalizedLinkedChild[];
  childLocation: Coordinate | null;
  emergencyHistory: Array<Record<string, unknown>>;
  emergencyPhone: string;
  setEmergencyPhone: (phone: string) => Promise<void>;
  setSafeZoneFromCurrentLocation: (radiusMeters: number, name: string) => Promise<void>;
  fetchSafeZones: (childId?: string) => Promise<void>;
  fetchLinkedChildren: (force?: boolean) => Promise<void>;
  deleteSafeZone: (zoneId: string) => Promise<void>;
  updateSafeZone: (zoneId: string, payload: Record<string, unknown>) => Promise<void>;
  linkChild: (childIdentifier: string) => Promise<void>;
  fetchChildLocation: (childId: string) => Promise<void>;
  updateChildLocation: () => Promise<void>;
  fetchEmergencyHistory: () => Promise<void>;
  requestLocationPermissions: () => Promise<boolean>;
  sendEmergency: (trigger: EmergencyTrigger) => Promise<void>;
};

const SafetyContext = createContext<SafetyContextValue | undefined>(undefined);

let zoneSnapshot: SafeZone | null = null;
let emergencyPhoneSnapshot = '';

function distanceInMeters(from: Location.LocationObjectCoords, zone: SafeZone) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(zone.latitude - from.latitude);
  const dLon = toRadians(zone.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(zone.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data || !zoneSnapshot) {
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] }).locations;
  const latest = locations?.[0]?.coords;
  if (!latest) {
    return;
  }

  const distance = distanceInMeters(latest, zoneSnapshot);
  if (distance > zoneSnapshot.radiusMeters) {
    await triggerEmergencyAlert({
      trigger: 'safe-zone',
      contactPhone: emergencyPhoneSnapshot,
      safeZoneName: zoneSnapshot.name,
    });
  }
});

async function ensureBackgroundUpdatesStarted() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000,
    distanceInterval: 20,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'SmartAid tracking active',
      notificationBody: 'Monitoring safe zone in the background.',
    },
  });
}

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const lastFetchTime = useRef(0);
  const [safeZone, setSafeZone] = useState<SafeZone | null>(null);
  const [safeZones, setSafeZones] = useState<NormalizedSafeZone[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<NormalizedLinkedChild[]>([]);
  const [childLocation, setChildLocation] = useState<Coordinate | null>(null);
  const [emergencyHistory, setEmergencyHistory] = useState<Array<Record<string, unknown>>>([]);
  const [emergencyPhone, setEmergencyPhoneState] = useState('');

  useEffect(() => {
    void (async () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      await Notifications.requestPermissionsAsync();
      const [storedZone, storedPhone] = await Promise.all([loadSafeZone(), loadEmergencyContactPhone()]);
      if (storedZone) {
        setSafeZone(storedZone);
        zoneSnapshot = storedZone;
      }
      if (storedPhone) {
        setEmergencyPhoneState(storedPhone);
        emergencyPhoneSnapshot = storedPhone;
      }
      await Promise.allSettled([
        fetchSafeZonesInternal(),
        fetchEmergencyHistoryInternal(),
        fetchLinkedChildrenInternal(),
      ]);
    })();
  }, []);

  const fetchSafeZonesInternal = async (childId?: string) => {
    const url = childId
      ? `/locations/safezone/?child_id=${childId}`
      : '/locations/safezone/';
    const { response, data } = await apiGet(url);
    if (response.ok && Array.isArray(data)) {
      setSafeZones(normalizeSafeZones(data));
      return;
    }
    setSafeZones([]);
  };

  const fetchEmergencyHistoryInternal = async () => {
    const { response, data } = await apiGet('/emergency/history/');
    if (response.ok && Array.isArray(data)) {
      setEmergencyHistory(data as Array<Record<string, unknown>>);
    }
  };

  const fetchLinkedChildrenInternal = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 30000) {
      return; // Use cached data if fetched within the last 30 seconds
    }

    const { response, data } = await apiGet('/locations/linked-children/');
    if (!response.ok || !Array.isArray(data)) {
      setLinkedChildren([]);
      return;
    }

    const normalized = normalizeLinkedChildren(data);

    // Set children immediately so the UI isn't blank while we fetch locations
    setLinkedChildren(normalized);

    // Now batch-fetch the last location for every child in parallel using Promise.all
    const locationResults = await Promise.all(
      normalized.map(async (child) => {
        try {
          const { response: locRes, data: locData } = await apiGet(
            `/locations/location/child/${child.id}/`
          );
          if (!locRes.ok) return { childId: child.id, coordinate: null };
          const coordinate = normalizeChildLocation(locData);
          return { childId: child.id, coordinate };
        } catch (error) {
          return { childId: child.id, coordinate: null };
        }
      })
    );

    // Merge freshly-fetched coordinates into children without clearing existing ones
    setLinkedChildren((prev) => {
      const coordMap = new Map<string, Coordinate | null>();
      for (const result of locationResults) {
        if (result.coordinate) {
          coordMap.set(result.childId, result.coordinate);
        }
      }
      // If no new coords came back, keep prev as-is to avoid blank states
      if (coordMap.size === 0) return prev;
      return prev.map((child) => {
        const freshCoord = coordMap.get(child.id);
        return freshCoord ? { ...child, coordinate: freshCoord } : child;
      });
    });

    lastFetchTime.current = Date.now();
  };

  const requestLocationPermissions = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      return false;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === 'granted';
  };

  const setEmergencyPhone = async (phone: string) => {
    setEmergencyPhoneState(phone);
    emergencyPhoneSnapshot = phone;
    await saveEmergencyContactPhone(phone);
  };

  const setSafeZoneFromCurrentLocation = async (radiusMeters: number, name: string) => {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const zone: SafeZone = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      radiusMeters,
      name,
    };
    setSafeZone(zone);
    zoneSnapshot = zone;
    await saveSafeZone(zone);
    await ensureBackgroundUpdatesStarted();

    const { response } = await apiPost('/locations/safezone/', {
      zone_name: name,
      lng: zone.longitude,
      lat: zone.latitude,
      radius: radiusMeters,
    });
    if (response.ok) {
      await fetchSafeZonesInternal();
    }
  };

  const fetchSafeZones = async (childId?: string) => {
    await fetchSafeZonesInternal(childId);
  };

  const fetchLinkedChildren = async (force = false) => {
    await fetchLinkedChildrenInternal(force);
  };

  const deleteSafeZone = async (zoneId: string) => {
    const { response } = await apiDelete(`/locations/safezone/${zoneId}/`);
    if (!response.ok) {
      throw new Error('Failed to delete safe zone');
    }
    await fetchSafeZonesInternal();
  };

  const updateSafeZone = async (zoneId: string, payload: Record<string, unknown>) => {
    const { access } = await getStoredTokens();
    const response = await fetch(`${API_BASE_URL}/locations/safezone/${zoneId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to update safe zone');
    }
    await fetchSafeZonesInternal();
  };

  const linkChild = async (childIdentifier: string) => {
    const { response, data } = await apiPost('/locations/link-child/', {
      dependent_email: childIdentifier,
    });
    if (!response.ok) {
      const message =
        (data && typeof data === 'object'
          ? ((data as { message?: string; detail?: string }).message ||
            (data as { detail?: string }).detail)
          : null) || 'Failed to link child';
      throw new Error(String(message));
    }
  };

  const fetchChildLocation = async (childId: string) => {
    const { response, data } = await apiGet(`/locations/location/child/${childId}/`);
    if (!response.ok) {
      throw new Error('Failed to fetch child location');
    }
    const coordinate = normalizeChildLocation(data);
    setChildLocation(coordinate);
    setLinkedChildren((prev) =>
      prev.map((child) =>
        String(child.id) === String(childId)
          ? { ...child, coordinate: coordinate ?? child.coordinate }
          : child,
      ),
    );
  };

  const updateChildLocation = async () => {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { response, data } = await apiPost('/locations/location/update/', {
      lng: current.coords.longitude,
      lat: current.coords.latitude,
    });
    if (!response.ok) {
      const message =
        (data && typeof data === 'object'
          ? ((data as { message?: string; detail?: string }).message ||
            (data as { detail?: string }).detail)
          : null) || 'Failed to update child location';
      throw new Error(String(message));
    }
  };

  const fetchEmergencyHistory = async () => {
    await fetchEmergencyHistoryInternal();
  };

  const sendEmergency = async (trigger: EmergencyTrigger) => {
    await triggerEmergencyAlert({
      trigger,
      contactPhone: emergencyPhone,
      safeZoneName: safeZone?.name,
    });
  };

  const value = useMemo(
    () => ({
      safeZone,
      safeZones,
      linkedChildren,
      childLocation,
      emergencyHistory,
      emergencyPhone,
      setEmergencyPhone,
      setSafeZoneFromCurrentLocation,
      fetchSafeZones,
      fetchLinkedChildren,
      deleteSafeZone,
      updateSafeZone,
      linkChild,
      fetchChildLocation,
      updateChildLocation,
      fetchEmergencyHistory,
      requestLocationPermissions,
      sendEmergency,
    }),
    [safeZone, safeZones, linkedChildren, childLocation, emergencyHistory, emergencyPhone]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used inside SafetyProvider');
  }
  return context;
}
