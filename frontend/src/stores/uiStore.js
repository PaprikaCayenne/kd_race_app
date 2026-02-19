import { create } from 'zustand';

const DEFAULT_OFFSETS = {
  leaderboard: { x: 0, y: 0 },
  race: { x: 0, y: 0 }
};

export const useUIStore = create((set) => ({
  panelOffsets: DEFAULT_OFFSETS,
  setPanelOffset: (key, offset) => set((state) => ({
    panelOffsets: {
      ...state.panelOffsets,
      [key]: offset
    }
  })),
  resetPanelOffsets: () => set({ panelOffsets: DEFAULT_OFFSETS })
}));
