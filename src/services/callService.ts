import { apiGet, apiPost, extractApiErrorMessage } from '../api/client';
import { parseAgoraSession, type AgoraSession } from '../utils/agoraSession';

export type InitiateCallResponse = {
  message?: string;
  call_id: string;
  token: string;
  channel_name: string;
  agora_app_id?: string;
  uid?: number;
  call?: unknown;
  agoraSession: AgoraSession;
};

function buildCallError(data: unknown, status: number) {
  const backendMessage = extractApiErrorMessage(data, status);
  if (backendMessage && !backendMessage.startsWith('Request failed')) return backendMessage;

  if (status === 400) return 'The receiver cannot be called right now. They may not have a saved notification token.';
  if (status === 403) return 'You are not authorized to call this user.';
  if (status === 500) return 'The call service is not configured correctly on the server.';
  if (status === 502) return 'The call was created, but the notification could not be delivered.';
  return backendMessage;
}

export async function initiateAudioCall(childId: string): Promise<InitiateCallResponse> {
  const { response, data } = await apiPost('/emergency/initiate-call/', {
    child_id: childId,
  });

  if (response.status !== 201) {
    throw new Error(buildCallError(data, response.status));
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Call server returned an empty response.');
  }

  const payload = data as Record<string, unknown>;
  const callId = String(payload.call_id ?? payload.callId ?? '');
  const agoraSession = parseAgoraSession(data, callId);

  if (!callId) {
    throw new Error('Call server did not return a call id.');
  }
  if (!agoraSession) {
    throw new Error(
      'Call server did not return a valid Agora token and channel_name. Check the initiate-call API response.',
    );
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : undefined,
    call_id: callId,
    token: agoraSession.token,
    channel_name: agoraSession.channelName,
    agora_app_id: agoraSession.appId,
    uid: agoraSession.uid,
    call: payload.call,
    agoraSession,
  };
}

export async function answerCall(callId: string): Promise<AgoraSession | null> {
  const { response, data } = await apiPost(`/emergency/calls/${callId}/answer/`, undefined);
  if (!response.ok) {
    throw new Error(buildCallError(data, response.status));
  }
  return parseAgoraSession(data, callId);
}

export async function endCall(callId: string, reason = 'ended_by_user') {
  const { response, data } = await apiPost(`/emergency/calls/${callId}/end/`, { reason });
  if (!response.ok) {
    throw new Error(buildCallError(data, response.status));
  }
  return data;
}

export async function fetchCallHistory(limit = 50) {
  const { response, data } = await apiGet(`/emergency/calls/history/?limit=${limit}`);
  if (!response.ok) {
    throw new Error(buildCallError(data, response.status));
  }
  return data;
}
