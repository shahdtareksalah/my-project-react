import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { getStoredTokens, API_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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


  const { access } = await getStoredTokens();

  // Pre-flight Verification
  try {
    const meCheck = await fetch(`${API_BASE_URL}/users/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access}`,
      },
    });

    if (meCheck.ok) {
      const meData = await meCheck.json();
      const linkedUsers = [
        ...(meData.linked_parents ?? []),
        ...(meData.linked_dependents ?? [])
      ];
      if (linkedUsers.length === 0) {
        Alert.alert(
          'Profile Not Linked',
          'You are not linked to another account. Cannot send SOS.'
        );
        throw new Error('Cannot send SOS: No linked users.');
      }
    }

    if (meCheck.ok) {
      const parentData = await meCheck.json();
      if (Array.isArray(parentData) && parentData.length === 0) {
        Alert.alert(
          'Profile Not Linked',
          'You are not linked to another account. Cannot send SOS.'
        );
        throw new Error('Cannot send SOS: No users linked.');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('No users linked')) {
      throw error;
    }
    console.warn('Verification check failed', error);
  }



  try {
    const response = await fetch(`${API_BASE_URL}/emergency/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${access}`,
      },
      body: JSON.stringify({
        location: [
          parseFloat(coords.longitude.toFixed(5)),
          parseFloat(coords.latitude.toFixed(5)),
        ],
      }),
    });

    if (response.status === 201 || response.ok) {
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
    } else {
      Alert.alert('Alert Failed', 'The server rejected the emergency alert.');
    }
  } catch (error) {
    Alert.alert('Alert Failed', 'Network error occurred while sending the alert.');
  }

  return coords;
}
