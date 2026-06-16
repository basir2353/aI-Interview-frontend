/**
 * Socket.io client for real-time updates (e.g. live transcript, phase change).
 * Connect when entering an interview; backend can emit state updates or STT chunks.
 */

import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from './backendOrigin';

const SOCKET_URL = getBackendOrigin();

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(interviewId: string): Socket {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    path: '/socket.io',
    query: { interviewId },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onInterviewEvent(
  event: string,
  handler: (data: unknown) => void
): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on(event, handler);
  return () => s.off(event);
}
