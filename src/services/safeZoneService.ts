import AsyncStorage from '@react-native-async-storage/async-storage';

export type SafeZone = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name: string;
};

const SAFE_ZONE_KEY = 'smartaid_safe_zone';
const EMERGENCY_CONTACT_KEY = 'smartaid_emergency_contact';

export async function saveSafeZone(zone: SafeZone) {
  await AsyncStorage.setItem(SAFE_ZONE_KEY, JSON.stringify(zone));
}

export async function loadSafeZone() {
  const value = await AsyncStorage.getItem(SAFE_ZONE_KEY);
  return value ? (JSON.parse(value) as SafeZone) : null;
}

export async function saveEmergencyContactPhone(phone: string) {
  await AsyncStorage.setItem(EMERGENCY_CONTACT_KEY, phone);
}

export async function loadEmergencyContactPhone() {
  return AsyncStorage.getItem(EMERGENCY_CONTACT_KEY);
}
