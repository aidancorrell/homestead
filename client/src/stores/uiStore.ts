import { create } from 'zustand';

interface UIState {
  showCreateServer: boolean;
  showInviteModal: boolean;
  showCreateChannel: boolean;
  showSettings: boolean;
  setShowCreateServer: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowCreateChannel: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showCreateServer: false,
  showInviteModal: false,
  showCreateChannel: false,
  showSettings: false,
  setShowCreateServer: (show) => set({ showCreateServer: show }),
  setShowInviteModal: (show) => set({ showInviteModal: show }),
  setShowCreateChannel: (show) => set({ showCreateChannel: show }),
  setShowSettings: (show) => set({ showSettings: show }),
}));
