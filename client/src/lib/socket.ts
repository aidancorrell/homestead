import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';
import { getAccessToken } from './api';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
let onReconnectCallback: (() => void) | null = null;

export function getSocket(): TypedSocket | null {
  return socket;
}

export function setOnReconnect(callback: (() => void) | null) {
  onReconnectCallback = callback;
}

export function connectSocket(): TypedSocket {
  if (socket?.connected) return socket;

  socket = io({
    auth: { token: getAccessToken() },
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
  }) as TypedSocket;

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected, id:', socket!.id);
    // If this is a reconnection (not the first connect), re-join voice
    if (onReconnectCallback) {
      onReconnectCallback();
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected, reason:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  onReconnectCallback = null;
}
