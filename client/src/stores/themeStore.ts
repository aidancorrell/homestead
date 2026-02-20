import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'cyberpunk' | 'tsushima';

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
    {
      name: 'homestead-theme',
      // Migrate japandi → tsushima for users with old persisted value
      migrate: (persisted: unknown) => {
        const state = persisted as { theme?: string };
        if (state?.theme === 'japandi') {
          return { ...state, theme: 'tsushima' as Theme };
        }
        return state as ThemeState;
      },
      version: 1,
    },
  ),
);
