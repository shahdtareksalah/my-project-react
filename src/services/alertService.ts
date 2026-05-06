import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { apiPost } from '../api/client';

export type EmergencyTrigger = 'manual' | 'voice' | 'safe-zone';

type EmergencyPayload = {
  trigger: EmergencyTrigger;
  contactPhone?: string;
  safeZoneName?: string;
};

async function getCurrentCoordinates() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    throw new Error('Location permission is required to send emergency alerts.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export async function triggerEmergencyAlert({
  trigger,
  contactPhone,
  safeZoneName,
}: EmergencyPayload) {
  const coords = await getCurrentCoordinates();
  const mapsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
  const reason =
    trigger === 'safe-zone' && safeZoneName
      ? `Safe-zone exited: ${safeZoneName}`
      : trigger === 'voice'
        ? 'Voice command'
        : 'Manual trigger';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SmartAid Emergency Alert',
      body: `Emergency detected. Reason: ${reason}. Location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
      data: { ...coords, reason },
    },
    trigger: null,
  });

  await apiPost('/emergency/', {
    trigger,
    latitude: coords.latitude,
    longitude: coords.longitude,
    safe_zone_name: safeZoneName ?? null,
  });

  if (contactPhone && Platform.OS !== 'web') {
    const smsBody = `Emergency alert from SmartAid.\nReason: ${reason}\nLocation: ${mapsUrl}`;
    const smsUrl =
      Platform.OS === 'ios'
        ? `sms:${contactPhone}&body=${encodeURIComponent(smsBody)}`
        : `sms:${contactPhone}?body=${encodeURIComponent(smsBody)}`;
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (canOpen) {
      await Linking.openURL(smsUrl);
    } else {
      Alert.alert('Emergency Alert Sent', `Location shared: ${mapsUrl}`);
    }
  } else {
    Alert.alert('Emergency Alert Sent', `Location shared: ${mapsUrl}`);
  }

  return coords;
}
