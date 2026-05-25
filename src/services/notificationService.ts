import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import type {
  CallAnsweredPayload,
  CallMissedPayload,
  IncomingCallPayload,
} from '../types/call';
import { apiPost, extractApiErrorMessage, getStoredTokens } from '../api/client';
import { emitCallStatusEvent } from './callEvents';
import { parseAgoraSession } from '../utils/agoraSession';

const EAS_PROJECT_ID = '6ff7e8fe-7c9b-4cc2-a467-ccef35cbd19b';
export const INCOMING_CALL_BACKGROUND_TASK = 'SMARTAID_INCOMING_CALL_BACKGROUND_TASK';

type PushRegistrationResult = {
  token: string | null;
  error?: string;
};

function getExpoProjectId(): string {
  const fromConfig =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : EAS_PROJECT_ID;
}

function formatExpoPushError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return (
      'Push notifications do not work in Expo Go (SDK 53+). ' +
      'Install the SmartAid dev build on this phone: npx expo run:android'
    );
  }

  if (
    message.includes('Firebase') ||
    message.includes('FCM') ||
    message.includes('firebase') ||
    message.includes('Default FirebaseApp')
  ) {
    return (
      'Android push needs Firebase (FCM). Add google-services.json from Firebase Console, ' +
      'upload FCM credentials in expo.dev → your project → Credentials, then rebuild: npx expo run:android'
    );
  }

  if (message.includes('projectId') || message.includes('project ID')) {
    return `Missing EAS project ID. Expected ${getExpoProjectId()}. Check app.json extra.eas.projectId.`;
  }

  return message || 'Unknown error from getExpoPushTokenAsync';
}

async function requestAllNotificationPermissions(): Promise<{ granted: boolean; message?: string }> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const postNotifications = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const alreadyGranted = await PermissionsAndroid.check(postNotifications);
    if (!alreadyGranted) {
      const result = await PermissionsAndroid.request(postNotifications, {
        title: 'Allow notifications',
        message: 'SmartAid needs notifications to ring when a parent calls.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return {
          granted: false,
          message:
            'Notification permission was denied. Open Settings → Apps → SmartAid → Notifications and turn them on.',
        };
      }
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    return { granted: true };
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (requested.status !== 'granted') {
    return {
      granted: false,
      message:
        'Notification permission was denied. Open system Settings and enable notifications for SmartAid.',
    };
  }

  return { granted: true };
}

type IncomingCallDispatch = (payload: IncomingCallPayload) => void;
let incomingCallDispatch: IncomingCallDispatch | null = null;

export function setIncomingCallDispatch(dispatch: IncomingCallDispatch | null) {
  incomingCallDispatch = dispatch;
}

function dispatchIncomingCall(payload: IncomingCallPayload) {
  incomingCallDispatch?.(payload);
}

function normalizeData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, unknown>;
}

function pickCallId(payload: Record<string, unknown>, channelName: string): string {
  const explicit =
    typeof payload.call_id === 'string'
      ? payload.call_id.trim()
      : typeof payload.callId === 'string'
        ? payload.callId.trim()
        : '';

  // Backend FCM may only send channel_name (e.g. "call_a1b2c3") — use it as the call key.
  return explicit || channelName;
}

/** True when FCM data is an incoming_call (values may arrive as strings). */
export function isIncomingCallNotification(data: unknown): boolean {
  const payload = normalizeData(data);
  return String(payload.type ?? '') === 'incoming_call';
}

/**
 * Parses Step 3 FCM payload:
 * { type, channel_name, token, agora_app_id, uid, caller_name [, call_id] }
 */
export function parseIncomingCallPayload(data: unknown): IncomingCallPayload | null {
  const payload = normalizeData(data);
  if (!isIncomingCallNotification(payload)) return null;

  const channelFirst = parseAgoraSession(payload);
  if (!channelFirst) return null;

  const callId = pickCallId(payload, channelFirst.channelName);
  const agoraSession = parseAgoraSession(payload, callId) ?? channelFirst;

  const callerId = payload.caller_id ?? payload.callerId;
  const callerName = payload.caller_name ?? payload.callerName;

  return {
    type: 'incoming_call',
    call_id: callId,
    channel_name: agoraSession.channelName,
    token: agoraSession.token,
    agora_app_id: agoraSession.appId,
    uid: agoraSession.uid,
    caller_id: typeof callerId === 'string' ? callerId : undefined,
    caller_name: typeof callerName === 'string' && callerName.trim() ? callerName : 'Caller',
  };
}

export function parseCallAnsweredPayload(data: unknown): CallAnsweredPayload | null {
  const payload = normalizeData(data);
  if (payload.type !== 'call_answered') return null;
  if (typeof payload.call_id !== 'string') return null;
  return { type: 'call_answered', call_id: payload.call_id };
}

export function parseCallMissedPayload(data: unknown): CallMissedPayload | null {
  const payload = normalizeData(data);
  if (payload.type !== 'call_missed') return null;
  if (typeof payload.call_id !== 'string') return null;
  return {
    type: 'call_missed',
    call_id: payload.call_id,
    reason: typeof payload.reason === 'string' ? payload.reason : undefined,
  };
}

function handleCallStatusPayload(data: unknown) {
  const answered = parseCallAnsweredPayload(data);
  if (answered) {
    emitCallStatusEvent(answered);
    return;
  }

  const missed = parseCallMissedPayload(data);
  if (missed) {
    emitCallStatusEvent(missed);
  }
}

function handleNotificationData(data: unknown) {
  const incoming = parseIncomingCallPayload(data);
  if (incoming) {
    dispatchIncomingCall(incoming);
    return;
  }
  handleCallStatusPayload(data);
}

Notifications.setNotificationHandler({
  handleNotification: async (event) => {
    const data = event.request.content.data;

    if (isIncomingCallNotification(data)) {
      const incoming = parseIncomingCallPayload(data);
      if (incoming) {
        // Opens IncomingCallModal (full-screen) via CallProvider
        dispatchIncomingCall(incoming);
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    };
  },
});

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  INCOMING_CALL_BACKGROUND_TASK,
  async ({ data, error }) => {
    if (error) return;

    const payload = parseIncomingCallPayload(data);
    if (!payload) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Incoming Call',
        body: `${payload.caller_name} is calling`,
        data: payload as unknown as Record<string, unknown>,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  },
);

export async function registerIncomingCallBackgroundTask() {
  try {
    await Notifications.registerTaskAsync(INCOMING_CALL_BACKGROUND_TASK);
  } catch (error) {
    console.warn('Incoming call background task registration failed', error);
  }
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('incoming-calls', {
    name: 'Incoming calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A2B40',
    sound: 'default',
  });
}

/**
 * Requests permission and returns the Expo push token (ExponentPushToken[...]).
 * Required on the child device after login so incoming_call pushes can be delivered.
 */
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  await ensureAndroidNotificationChannel();

  const permission = await requestAllNotificationPermissions();
  if (!permission.granted) {
    return { token: null, error: permission.message };
  }

  try {
    const projectId = getExpoProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (!token?.startsWith('ExponentPushToken[')) {
      console.warn('[Push] Unexpected token format:', token);
    }

    return { token };
  } catch (error) {
    const errorMessage = formatExpoPushError(error);
    console.warn('[Push] getExpoPushTokenAsync failed:', error);
    return { token: null, error: errorMessage };
  }
}

/**
 * Requests permission and returns the NATIVE FCM device token (e.g. "dfL9s2kF...").
 * The Django backend's firebase_admin.messaging.Message(token=...) requires this
 * native FCM token, NOT an Expo push token.
 *
 * Call this instead of registerForPushNotifications() when the backend sends
 * pushes via Firebase Admin SDK directly (not Expo Push API).
 */
export async function registerForNativePushNotifications(): Promise<PushRegistrationResult> {
  await ensureAndroidNotificationChannel();

  const permission = await requestAllNotificationPermissions();
  if (!permission.granted) {
    return { token: null, error: permission.message };
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    if (!token || typeof token !== 'string' || token.length === 0) {
      return { token: null, error: 'getDevicePushTokenAsync returned an empty token.' };
    }

    return { token };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[Push] getDevicePushTokenAsync failed:', message);

    // Fallback: try Expo push token if native FCM fails
    console.warn('[Push] Falling back to Expo push token...');
    try {
      const projectId = getExpoProjectId();
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      if (token?.startsWith('ExponentPushToken[')) {
        console.warn('[Push] WARNING: Using Expo push token — backend must use Expo Push API, not firebase-admin directly.');
        return { token };
      }
      return { token: null, error: 'Fallback Expo push token also failed.' };
    } catch (fallbackError) {
      return {
        token: null,
        error: `Native FCM failed (${message}), Expo fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      };
    }
  }
}

export type PushTokenSyncResult = {
  success: boolean;
  token: string | null;
  message?: string;
};

export function buildPushTokenBody(expoPushToken: string | null): { fcm_token: string } | Record<string, never> {
  if (!expoPushToken) return {};
  return { fcm_token: expoPushToken };
}

let lastSyncedToken: string | null = null;
let isSyncingPushToken = false;

/**
 * Required on the child device immediately after login:
 * Gets a NATIVE FCM token (for firebase_admin backend) and POSTs to /users/fcm-token/.
 *
 * Falls back to Expo push token if native FCM is unavailable.
 */
export async function syncPushTokenToBackend(): Promise<PushTokenSyncResult> {
  if (isSyncingPushToken) {
    return { success: false, token: null, message: 'Already syncing' };
  }
  isSyncingPushToken = true;
  try {
  const { access } = await getStoredTokens();
  if (!access) {
    return { success: false, token: null, message: 'Not logged in — save access token before syncing push token.' };
  }

  // Use Expo push token — backend sends via Expo Push API (not firebase_admin directly)
  const registration = await registerForPushNotifications();
  const pushToken = registration.token;
  if (!pushToken) {
    return {
      success: false,
      token: null,
      message:
        registration.error ||
        'Could not get Expo push token. Allow notifications and use a dev build (not Expo Go).',
    };
  }

  if (pushToken === lastSyncedToken) {
    return { success: true, token: pushToken };
  }

  // Set this immediately to prevent concurrent calls bypassing the check
  lastSyncedToken = pushToken;

  const { response, data } = await apiPost('/users/fcm-token/', { fcm_token: pushToken });
  if (!response.ok) {
    // Revert if it failed so we can try again later
    lastSyncedToken = null;
    const message = extractApiErrorMessage(data, response.status);
    console.warn('[Push] POST /users/fcm-token/ failed', response.status, data);
    return { success: false, token: pushToken, message };
  }

  if (__DEV__) {
    console.log('[Push] Saved fcm_token:', pushToken);
  }

  return { success: true, token: pushToken };
  } finally {
    isSyncingPushToken = false;
  }
}

/** @deprecated Use syncPushTokenToBackend */
export async function registerFcmTokenWithBackend(expoPushToken: string | null) {
  if (!expoPushToken) return;
  const { access } = await getStoredTokens();
  if (!access) return;
  await apiPost('/users/fcm-token/', { fcm_token: expoPushToken });
}

/** Call after every successful login/register (JWT must already be in AsyncStorage). */
export async function registerPushTokenAfterAuth(): Promise<PushTokenSyncResult> {
  return syncPushTokenToBackend();
}

export function addPushTokenRefreshListener() {
  const subscription = Notifications.addPushTokenListener(() => {
    void syncPushTokenToBackend();
  });

  return () => subscription.remove();
}

export function addIncomingCallListeners(onIncomingCall: (payload: IncomingCallPayload) => void) {
  const handleNotification = (data: unknown) => {
    const incoming = parseIncomingCallPayload(data);
    if (incoming) {
      onIncomingCall(incoming);
      return;
    }
    handleCallStatusPayload(data);
  };

  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    handleNotification(notification.request.content.data);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotification(response.notification.request.content.data);
  });

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      handleNotification(response.notification.request.content.data);
      Notifications.clearLastNotificationResponse();
    })
    .catch((error) => console.warn('Failed to read last notification response', error));

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
