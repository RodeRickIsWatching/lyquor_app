import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from "zustand/middleware/immer";

export interface IPlaygroundItem {
  id: string;
  name: string;
}

interface PlaygroundState {
  playgrounds: IPlaygroundItem[]
  clear: () => void
  addPlayground: (v: IPlaygroundItem) => void
  removePlayground: (id: string) => void
  renamePlayground: (id: string, name: string) => void
}

export const usePlaygroundTree = create<PlaygroundState>()(
  persist(
    immer((set) => ({
      playgrounds: [],
      clear: () =>
        set((state) => {
          state.playgrounds = [];
        }),
      addPlayground: (v: IPlaygroundItem) =>
        set((state) => {
          state.playgrounds.push(v);
        }),
      removePlayground: (id: string) =>
        set((state) => {
          state.playgrounds = state.playgrounds.filter((i) => i.id !== id);
        }),
      renamePlayground: (id: string, name: string) =>
        set((state) => {
          const target = state.playgrounds.find((i) => i.id === id)
          if (target) target.name = name
        }),
    })),
    {
      name: 'terminal-tree',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ playgrounds: state.playgrounds }),
    }
  )
);
