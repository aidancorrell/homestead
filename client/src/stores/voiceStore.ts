import { create } from 'zustand';
import type { VoiceParticipant } from '../types/socket';

interface VoiceState {
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  participants: VoiceParticipant[];
  speaking: Set<string>;
  setChannel: (channelId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setParticipants: (participants: VoiceParticipant[]) => void;
  addParticipant: (participant: VoiceParticipant) => void;
  removeParticipant: (userId: string) => void;
  setSpeaking: (userId: string, isSpeaking: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  channelId: null,
  isMuted: false,
  isDeafened: false,
  participants: [],
  speaking: new Set(),

  setChannel: (channelId) =>
    set({ channelId, participants: [], speaking: new Set() }),

  setMuted: (isMuted) => set({ isMuted }),

  setDeafened: (isDeafened) =>
    set((state) => ({ isDeafened, isMuted: isDeafened ? true : state.isMuted })),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.some((p) => p.userId === participant.userId)
        ? state.participants
        : [...state.participants, participant],
    })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
      speaking: (() => {
        const s = new Set(state.speaking);
        s.delete(userId);
        return s;
      })(),
    })),

  setSpeaking: (userId, isSpeaking) =>
    set((state) => {
      const speaking = new Set(state.speaking);
      if (isSpeaking) speaking.add(userId);
      else speaking.delete(userId);
      return { speaking };
    }),
}));
