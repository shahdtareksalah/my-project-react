import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IncomingCallPayload } from '../types/call';
import { IncomingCallModal } from '../components/IncomingCallModal';
import {
  addIncomingCallListeners,
  addPushTokenRefreshListener,
  registerIncomingCallBackgroundTask,
  setIncomingCallDispatch,
} from '../services/notificationService';
import { navigationRef } from '../navigation/navigationRef';
import { answerCall, endCall } from '../services/callService';
import { AGORA_APP_ID } from '../config/agora';

type CallContextType = {
  incomingCall: IncomingCallPayload | null;
  clearIncomingCall: () => void;
};

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  clearIncomingCall: () => {},
});

export function CallProvider({ children }: { children: ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Wrap setIncomingCall to skip if the call was initiated by the current user
  const filteredSetIncomingCall = useCallback((payload: IncomingCallPayload | null) => {
    if (!payload) {
      setIncomingCall(null);
      return;
    }
    // Read current user ID each time (login may happen after mount)
    AsyncStorage.getItem('user_profile').then((raw) => {
      if (raw) {
        try {
          const profile = JSON.parse(raw);
          const currentUserId = profile?.user?.id;
          if (currentUserId && payload.caller_id === currentUserId) {
            return; // Ignore — our own call
          }
        } catch { /* ignore */ }
      }
      setIncomingCall(payload);
    });
  }, []);

  useEffect(() => {
    setIncomingCallDispatch(filteredSetIncomingCall);
    void registerIncomingCallBackgroundTask();
    const removeIncomingCallListeners = addIncomingCallListeners(filteredSetIncomingCall);
    const removeTokenRefreshListener = addPushTokenRefreshListener();

    return () => {
      setIncomingCallDispatch(null);
      removeIncomingCallListeners();
      removeTokenRefreshListener();
    };
  }, [filteredSetIncomingCall]);

  useEffect(() => {
    if (!incomingCall) return undefined;

    const timeout = setTimeout(() => {
      const call = incomingCall;
      setIncomingCall(null);
      void endCall(call.call_id, 'missed_timeout').catch((error) =>
        console.warn('Failed to mark missed call', error),
      );
    }, 45000);

    return () => clearTimeout(timeout);
  }, [incomingCall]);

  const clearIncomingCall = useCallback(() => {
    if (incomingCall) {
      void endCall(incomingCall.call_id, 'declined').catch((error) =>
        console.warn('Failed to reject call', error),
      );
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    const call = incomingCall;
    setAccepting(true);
    try {
      const answerSession = await answerCall(call.call_id);
      // Join with FCM credentials: token, channel_name, parseInt(uid) from push payload
      const session =
        answerSession ??
        ({
          appId: call.agora_app_id || AGORA_APP_ID,
          token: call.token,
          channelName: call.channel_name,
          uid: typeof call.uid === 'number' ? call.uid : Number.parseInt(String(call.uid ?? 0), 10) || 0,
        } as const);

      setIncomingCall(null);
      setAccepting(false);

      if (navigationRef.isReady()) {
        navigationRef.navigate('AudioCall', {
          callId: call.call_id,
          channelName: session.channelName,
          token: session.token,
          agoraAppId: session.appId,
          uid: session.uid,
          callerName: call.caller_name,
          isIncoming: true,
        });
      }
    } catch (error) {
      console.warn('Failed to mark call answered', error);
      setAccepting(false);
    }
  }, [incomingCall]);

  return (
    <CallContext.Provider value={{ incomingCall, clearIncomingCall }}>
      {children}
      <IncomingCallModal
        call={incomingCall}
        accepting={accepting}
        onAccept={() => void acceptIncomingCall()}
        onDecline={clearIncomingCall}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
