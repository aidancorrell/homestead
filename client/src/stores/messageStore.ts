import { create } from 'zustand';
import type { Message } from '../types/models';
import api from '../lib/api';

interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, Map<string, { username: string; timeout: ReturnType<typeof setTimeout> }>>;
  fetchMessages: (channelId: string, before?: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, userId: string, username: string) => void;
  clearTyping: (channelId: string, userId: string) => void;
  getTypingUsers: (channelId: string) => string[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChannel: {},
  hasMore: {},
  typingUsers: {},

  fetchMessages: async (channelId, before) => {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', '50');

    const { data } = await api.get(`/channels/${channelId}/messages?${params}`);

    set((state) => {
      const existing = before ? (state.messagesByChannel[channelId] || []) : [];
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: [...data.messages, ...existing],
        },
        hasMore: { ...state.hasMore, [channelId]: data.hasMore },
      };
    });
  },

  addMessage: (channelId, message) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [...(state.messagesByChannel[channelId] || []), message],
      },
    }));
    // Clear typing indicator for this user
    get().clearTyping(channelId, message.author_id);
  },

  updateMessage: (channelId, message) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] || []).map((m) =>
          m.id === message.id ? message : m,
        ),
      },
    }));
  },

  removeMessage: (channelId, messageId) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] || []).filter((m) => m.id !== messageId),
      },
    }));
  },

  setTyping: (channelId, userId, username) => {
    set((state) => {
      const channelTyping = new Map(state.typingUsers[channelId] || []);

      // Clear existing timeout
      const existing = channelTyping.get(userId);
      if (existing) clearTimeout(existing.timeout);

      // Set new timeout to clear after 3 seconds
      const timeout = setTimeout(() => {
        get().clearTyping(channelId, userId);
      }, 3000);

      channelTyping.set(userId, { username, timeout });

      return {
        typingUsers: { ...state.typingUsers, [channelId]: channelTyping },
      };
    });
  },

  clearTyping: (channelId, userId) => {
    set((state) => {
      const channelTyping = new Map(state.typingUsers[channelId] || []);
      const existing = channelTyping.get(userId);
      if (existing) {
        clearTimeout(existing.timeout);
        channelTyping.delete(userId);
      }
      return {
        typingUsers: { ...state.typingUsers, [channelId]: channelTyping },
      };
    });
  },

  getTypingUsers: (channelId) => {
    const channelTyping = get().typingUsers[channelId];
    if (!channelTyping) return [];
    return Array.from(channelTyping.values()).map((v) => v.username);
  },
}));
