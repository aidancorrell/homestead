import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  inputVolume: number;   // 0-1
  masterVolume: number;  // 0-1
  setInputDevice: (id: string | null) => void;
  setOutputDevice: (id: string | null) => void;
  setInputVolume: (vol: number) => void;
  setMasterVolume: (vol: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      inputDeviceId: null,
      outputDeviceId: null,
      inputVolume: 1,
      masterVolume: 1,

      setInputDevice: (inputDeviceId) => set({ inputDeviceId }),
      setOutputDevice: (outputDeviceId) => set({ outputDeviceId }),
      setInputVolume: (inputVolume) => set({ inputVolume }),
      setMasterVolume: (masterVolume) => set({ masterVolume }),
    }),
    { name: 'homestead-audio' },
  ),
);
