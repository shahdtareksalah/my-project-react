import Constants from 'expo-constants';

const env = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

/** Agora App ID — safe to ship in the client. Certificate must stay on Django only. */
export const AGORA_APP_ID = (
  env.process?.env?.EXPO_PUBLIC_AGORA_APP_ID ||
  String(Constants.expoConfig?.extra?.agoraAppId || '')
).trim();

export function isAgoraConfigured(): boolean {
  return AGORA_APP_ID.length === 32;
}
