import { AGORA_APP_ID } from '../config/agora';

export type AgoraSession = {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
};

const CHANNEL_ALLOWED = /^[a-zA-Z0-9 !#$%&()+,\-:;<=>.?@[\]^_{|}~]{1,64}$/;

function asRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickUid(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    }
  }
  return 0;
}

export function sanitizeChannelName(raw: string, fallbackCallId?: string): string {
  const trimmed = raw.trim();
  if (trimmed && CHANNEL_ALLOWED.test(trimmed)) return trimmed;

  if (fallbackCallId) {
    const fromCallId = fallbackCallId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (fromCallId && CHANNEL_ALLOWED.test(fromCallId)) return fromCallId;
  }

  throw new Error(
    `Invalid Agora channel name "${raw}". The server must return a channel_name using only Agora-allowed characters.`,
  );
}

/**
 * Normalizes initiate-call, answer-call, and FCM payloads into a single Agora join shape.
 * Handles snake_case, camelCase, and nested `agora` / `call` objects from Django.
 */
export function parseAgoraSession(data: unknown, fallbackCallId?: string): AgoraSession | null {
  const root = asRecord(data);
  const agora = asRecord(root.agora);
  const call = asRecord(root.call);

  const token = pickString(
    root.token,
    root.agora_token,
    root.rtc_token,
    agora.token,
    agora.rtc_token,
    call.token,
    call.agora_token,
  );

  const channelRaw = pickString(
    root.channel_name,
    root.channelName,
    root.channel,
    root.channel_id,
    agora.channel_name,
    agora.channelName,
    agora.channel,
    call.channel_name,
    call.channelName,
    call.channel,
  );

  const appId = pickString(
    root.agora_app_id,
    root.agoraAppId,
    root.app_id,
    root.appId,
    agora.agora_app_id,
    agora.app_id,
    agora.appId,
    call.agora_app_id,
  );

  // FCM sends uid as a string, e.g. "67890"
  const uid = pickUid(root.uid, root.user_id, root.agora_uid, agora.uid, call.uid);

  if (!token || !channelRaw) return null;

  const callId = pickString(root.call_id, root.callId, call.id, call.call_id) ?? fallbackCallId;

  return {
    appId: appId || AGORA_APP_ID,
    token,
    channelName: sanitizeChannelName(channelRaw, callId ?? undefined),
    uid,
  };
}
