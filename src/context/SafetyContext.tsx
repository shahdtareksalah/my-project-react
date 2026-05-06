import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { triggerEmergencyAlert, type EmergencyTrigger } from '../services/alertService';
import { apiDelete, apiGet, apiPost } from '../api/client';
import {
  loadEmergencyContactPhone,
  loadSafeZone,
  saveEmergencyContactPhone,
  saveSafeZone,
  type SafeZone,
} from '../services/safeZoneService';

const LOCATION_TASK_NAME = 'smartaid-background-location';

type SafetyContextValue = {
  safeZone: SafeZone | null;
  safeZones: Array<Record<string, unknown>>;
  childLocation: Record<string, unknown> | null;
  emergencyHistory: Array<Record<string, unknown>>;
  emergencyPhone: string;
  setEmergencyPhone: (phone: string) => Promise<void>;
  setSafeZoneFromCurrentLocation: (radiusMeters: number, name: string) => Promise<void>;
  fetchSafeZones: () => Promise<void>;
  deleteSafeZone: (zoneId: string) => Promise<void>;
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
  const [safeZone, setSafeZone] = useState<SafeZone | null>(null);
  const [safeZones, setSafeZones] = useState<Array<Record<string, unknown>>>([]);
  const [childLocation, setChildLocation] = useState<Record<string, unknown> | null>(null);
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
      await Promise.allSettled([fetchSafeZonesInternal(), fetchEmergencyHistoryInternal()]);
    })();
  }, []);

  const fetchSafeZonesInternal = async () => {
    const { response, data } = await apiGet('/locations/safezone/');
    if (response.ok && Array.isArray(data)) {
      setSafeZones(data as Array<Record<string, unknown>>);
    }
  };

  const fetchEmergencyHistoryInternal = async () => {
    const { response, data } = await apiGet('/emergency/history/');
    if (response.ok && Array.isArray(data)) {
      setEmergencyHistory(data as Array<Record<string, unknown>>);
    }
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
      name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius_meters: radiusMeters,
    });
    if (response.ok) {
      await fetchSafeZonesInternal();
    }
  };

  const fetchSafeZones = async () => {
    await fetchSafeZonesInternal();
  };

  const deleteSafeZone = async (zoneId: string) => {
    const { response } = await apiDelete(`/locations/safezone/${zoneId}/`);
    if (!response.ok) {
      throw new Error('Failed to delete safe zone');
    }
    await fetchSafeZonesInternal();
  };

  const linkChild = async (childIdentifier: string) => {
    const { response, data } = await apiPost('/locations/link-child/', {
      child_id: childIdentifier,
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
    if (data && typeof data === 'object') {
      setChildLocation(data as Record<string, unknown>);
    }
  };

  const updateChildLocation = async () => {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { response, data } = await apiPost('/locations/location/update/', {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
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
      childLocation,
      emergencyHistory,
      emergencyPhone,
      setEmergencyPhone,
      setSafeZoneFromCurrentLocation,
      fetchSafeZones,
      deleteSafeZone,
      linkChild,
      fetchChildLocation,
      updateChildLocation,
      fetchEmergencyHistory,
      requestLocationPermissions,
      sendEmergency,
    }),
    [safeZone, safeZones, childLocation, emergencyHistory, emergencyPhone]
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
