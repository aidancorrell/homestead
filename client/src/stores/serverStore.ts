import { create } from 'zustand';
import type { Server, ServerMember, Channel } from '../types/models';
import api from '../lib/api';

interface ServerWithDetails extends Server {
  members?: ServerMember[];
  channels?: Channel[];
  role?: string;
}

interface ServerState {
  servers: ServerWithDetails[];
  activeServerId: string | null;
  activeServer: ServerWithDetails | null;
  fetchServers: () => Promise<void>;
  fetchServer: (id: string) => Promise<void>;
  setActiveServer: (id: string | null) => void;
  createServer: (name: string) => Promise<Server>;
  joinServer: (inviteCode: string) => Promise<Server>;
  regenerateInvite: (serverId: string) => Promise<string>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServerId: null,
  activeServer: null,

  fetchServers: async () => {
    const { data } = await api.get('/servers');
    set({ servers: data });
  },

  fetchServer: async (id) => {
    const { data } = await api.get(`/servers/${id}`);
    set((state) => ({
      activeServer: data,
      servers: state.servers.map((s) => (s.id === id ? { ...s, ...data } : s)),
    }));
  },

  setActiveServer: (id) => {
    set({ activeServerId: id, activeServer: null });
    if (id) get().fetchServer(id);
  },

  createServer: async (name) => {
    const { data } = await api.post('/servers', { name });
    set((state) => ({ servers: [...state.servers, data] }));
    return data;
  },

  joinServer: async (inviteCode) => {
    const { data } = await api.post('/servers/join', { invite_code: inviteCode });
    await get().fetchServers();
    return data;
  },

  regenerateInvite: async (serverId) => {
    const { data } = await api.post(`/servers/${serverId}/invite`);
    return data.invite_code;
  },
}));
