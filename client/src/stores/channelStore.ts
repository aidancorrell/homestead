import { create } from 'zustand';
import type { Channel } from '../types/models';
import api from '../lib/api';

interface ChannelState {
  channels: Channel[];
  activeChannelId: string | null;
  activeChannel: Channel | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (id: string | null) => void;
  createChannel: (serverId: string, name: string, type: 'text' | 'voice') => Promise<Channel>;
  deleteChannel: (serverId: string, channelId: string) => Promise<void>;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  activeChannelId: null,
  activeChannel: null,

  setChannels: (channels) => {
    set({ channels });
    // Update activeChannel if it's in the new list
    const active = get().activeChannelId;
    if (active) {
      set({ activeChannel: channels.find((c) => c.id === active) || null });
    }
  },

  setActiveChannel: (id) => {
    const channel = id ? get().channels.find((c) => c.id === id) || null : null;
    set({ activeChannelId: id, activeChannel: channel });
  },

  createChannel: async (serverId, name, type) => {
    const { data } = await api.post(`/servers/${serverId}/channels`, { name, type });
    set((state) => ({ channels: [...state.channels, data] }));
    return data;
  },

  deleteChannel: async (serverId, channelId) => {
    await api.delete(`/servers/${serverId}/channels/${channelId}`);
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
      activeChannel: state.activeChannelId === channelId ? null : state.activeChannel,
    }));
  },
}));
