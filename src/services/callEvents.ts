import type { CallAnsweredPayload, CallMissedPayload } from '../types/call';

type CallStatusListener = (event: CallAnsweredPayload | CallMissedPayload) => void;

const listeners = new Set<CallStatusListener>();

export function emitCallStatusEvent(event: CallAnsweredPayload | CallMissedPayload) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeCallStatusEvents(listener: CallStatusListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
