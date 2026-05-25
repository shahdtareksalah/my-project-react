export type IncomingCallPayload = {
  type: 'incoming_call';
  call_id: string;
  channel_name: string;
  token: string;
  agora_app_id?: string;
  uid?: number;
  caller_id?: string;
  caller_name: string;
};

export type CallAnsweredPayload = {
  type: 'call_answered';
  call_id: string;
};

export type CallMissedPayload = {
  type: 'call_missed';
  call_id: string;
  reason?: string;
};

export type CallPushPayload = IncomingCallPayload | CallAnsweredPayload | CallMissedPayload;

export type AudioCallRouteParams = {
  callId?: string;
  channelName?: string;
  token?: string;
  agoraAppId?: string;
  uid?: number;
  receiverId?: string;
  childId?: string; // Kept for backward compatibility
  callerName?: string;
  isIncoming?: boolean;
};

export type CallUiState = 'initiating' | 'ringing' | 'connected' | 'ended';
