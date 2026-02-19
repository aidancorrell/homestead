import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useMessageStore } from '../stores/messageStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { setupVoiceListeners, teardownVoiceListeners } from '../lib/voiceManager';
import api from '../lib/api';

let socketInitialized = false;

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      // User logged out - tear everything down
      if (socketInitialized) {
        teardownVoiceListeners();
        disconnectSocket();
        socketInitialized = false;
      }
      return;
    }

    // Already initialized - don't duplicate listeners
    if (socketInitialized) return;
    socketInitialized = true;

    const socket = connectSocket();

    // Fetch initial online users
    api.get('/users/online').then(({ data }) => {
      usePresenceStore.getState().setOnlineUsers(data);
    });

    socket.on('user:online', (userId: string) => {
      usePresenceStore.getState().addOnlineUser(userId);
    });

    socket.on('user:offline', (userId: string) => {
      usePresenceStore.getState().removeOnlineUser(userId);
    });

    socket.on('message:new', (message) => {
      useMessageStore.getState().addMessage(message.channel_id, message);
    });

    socket.on('message:typing', ({ channelId, userId, username }) => {
      useMessageStore.getState().setTyping(channelId, userId, username);
    });

    socket.on('message:edit', (message) => {
      useMessageStore.getState().updateMessage(message.channel_id, message);
    });

    socket.on('message:delete', ({ id, channelId }) => {
      useMessageStore.getState().removeMessage(channelId, id);
    });

    socket.on('voice:participants', ({ participants }) => {
      useVoiceStore.getState().setParticipants(participants);
    });

    socket.on('voice:user-joined', ({ userId, username }) => {
      useVoiceStore.getState().addParticipant({ userId, username });
    });

    socket.on('voice:user-left', ({ userId }) => {
      useVoiceStore.getState().removeParticipant(userId);
    });

    // Set up voice signaling listeners (once)
    setupVoiceListeners();

    // No cleanup - socket persists across StrictMode remounts.
    // We only disconnect when isAuthenticated becomes false (logout).
  }, [isAuthenticated]);

  return getSocket();
}
