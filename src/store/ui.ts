import { create } from 'zustand';
import type { StageId } from '@/lib/types';

interface UiState {
  selectedId: string | null;
  paletteOpen: boolean;
  newOpen: boolean;
  newStage: StageId;
  syncOpen: boolean;
  open: (id: string | null) => void;
  setPalette: (open: boolean) => void;
  openNew: (stage?: StageId) => void;
  closeNew: () => void;
  setSync: (open: boolean) => void;
}

/** UI-only state. Anything the user would call "their data" lives in the Yjs document instead. */
export const useUi = create<UiState>((set) => ({
  selectedId: null,
  paletteOpen: false,
  newOpen: false,
  newStage: 'wishlist',
  syncOpen: false,
  open: (selectedId) => set({ selectedId }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  openNew: (newStage = 'wishlist') => set({ newOpen: true, newStage }),
  closeNew: () => set({ newOpen: false }),
  setSync: (syncOpen) => set({ syncOpen }),
}));
