import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'cyberpunk' | 'japandi';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'homestead-theme' },
  ),
);
