import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  ChannelMediaOptions,
} from 'react-native-agora';
import type { AgoraSession } from '../utils/agoraSession';

export type JoinAgoraOptions = {
  session: AgoraSession;
  eventHandler: IRtcEngineEventHandler;
  onJoinError?: (code: number, message: string) => void;
};

const JOIN_ERROR_MESSAGES: Record<number, string> = {
  [-2]: 'Invalid token or join parameters. Check that the App ID matches your backend.',
  [-7]: 'Agora engine is not initialized yet. Please try again.',
  [-17]: 'Already in a channel.',
  [-102]: 'Invalid channel name from server. Ensure channel_name uses Agora-safe characters.',
  [-121]: 'Invalid user ID. The token may have been generated for a different uid.',
};

function joinErrorMessage(code: number) {
  return JOIN_ERROR_MESSAGES[code] ?? `Unable to join call (error ${code})`;
}

/**
 * Creates an engine, waits briefly for native init, then joins with backend credentials.
 */
export async function createAndJoinAgoraChannel({
  session,
  eventHandler,
  onJoinError,
}: JoinAgoraOptions): Promise<IRtcEngine> {
  if (!session.appId) {
    throw new Error('Agora App ID is missing. Set EXPO_PUBLIC_AGORA_APP_ID or return agora_app_id from the API.');
  }
  if (!session.token?.trim()) {
    throw new Error('Agora token is missing from the server response.');
  }
  if (!session.channelName?.trim()) {
    throw new Error('Agora channel name is missing from the server response.');
  }

  const engine = createAgoraRtcEngine();
  engine.registerEventHandler({
    ...eventHandler,
    onError: (err, msg) => {
      eventHandler.onError?.(err, msg);
      onJoinError?.(err, msg);
    },
  });

  const initCode = engine.initialize({ appId: session.appId });
  if (initCode < 0) {
    throw new Error(joinErrorMessage(initCode));
  }

  engine.enableAudio();

  const mediaOptions: ChannelMediaOptions = {
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    publishMicrophoneTrack: true,
    autoSubscribeAudio: true,
    autoSubscribeVideo: false,
  };

  // Let native initialize finish before join (avoids -7 / spurious -102 on some devices).
  await new Promise<void>((resolve) => setTimeout(resolve, 150));

  const joinCode = engine.joinChannel(
    session.token,
    session.channelName,
    session.uid,
    mediaOptions,
  );

  if (joinCode < 0) {
    try {
      engine.release();
    } catch {
      // ignore
    }
    throw new Error(joinErrorMessage(joinCode));
  }

  return engine;
}
