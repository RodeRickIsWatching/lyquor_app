// store/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: (target?: Theme) => void;
  applyTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      setTheme: (newTheme) => {
        set({ theme: newTheme });
        get().applyTheme(newTheme);
      },

      toggleTheme: (target) => {
        const { theme, setTheme } = get();
        const newTheme = target
          ? target
          : theme === 'light'
          ? 'dark'
          : 'light';
        setTheme(newTheme);
      },

      applyTheme: (newTheme) => {
        const root = document.querySelector<HTMLElement>('#root');
        if (!root) return;

        root.dataset.theme = newTheme;

        const opposite = newTheme === 'light' ? 'dark' : 'light';
        root.classList.remove(opposite);
        root.classList.add(newTheme);
      },
    }),
    {
      name: 'local-theme',
    }
  )
);
