import { create } from 'zustand';

interface RecorrenciaState {
  // override per userId → manual value (null = use auto-calculated)
  overrides: Record<string, number>;
  percentual: number; // default 30
  setOverride: (userId: string, value: number) => void;
  clearOverride: (userId: string) => void;
  setPercentual: (p: number) => void;
}

export const useRecorrenciaStore = create<RecorrenciaState>((set) => ({
  overrides: {},
  percentual: 30,

  setOverride: (userId, value) =>
    set((state) => ({ overrides: { ...state.overrides, [userId]: value } })),

  clearOverride: (userId) =>
    set((state) => {
      const next = { ...state.overrides };
      delete next[userId];
      return { overrides: next };
    }),

  setPercentual: (p) => set({ percentual: p }),
}));
