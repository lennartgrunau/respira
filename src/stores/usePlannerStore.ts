import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { PesPatternData } from "../formats/import/pesImporter";

// Conditional logging for development only
const isDev = import.meta.env.DEV;

export interface PlannedPattern {
  id: string;
  fileName: string;
  pesData: PesPatternData;
  offset: { x: number; y: number };
  rotation: number;
}

interface PlannerState {
  patterns: PlannedPattern[];
  selectedId: string | null;

  // Actions
  addPattern: (data: PesPatternData, fileName: string) => string;
  selectPattern: (id: string) => void;
  removePattern: (id: string) => void;
  updatePatternOffset: (id: string, x: number, y: number) => void;
  updatePatternRotation: (id: string, rotation: number) => void;
  clearPatterns: () => void;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  patterns: [],
  selectedId: null,

  addPattern: (data: PesPatternData, fileName: string) => {
    const id = generateId();
    const newPattern: PlannedPattern = {
      id,
      fileName,
      pesData: data,
      offset: { x: 0, y: 0 },
      rotation: 0,
    };

    set((state) => ({
      patterns: [...state.patterns, newPattern],
      selectedId: id,
    }));

    if (isDev) {
      console.log("[PlannerStore] Added pattern:", fileName, "id:", id);
    }

    return id;
  },

  selectPattern: (id: string) => {
    const pattern = get().patterns.find((p) => p.id === id);
    if (!pattern) {
      console.warn("[PlannerStore] Tried to select unknown pattern id:", id);
      return;
    }

    set({ selectedId: id });

    if (isDev) {
      console.log(
        "[PlannerStore] Selected pattern:",
        pattern.fileName,
        "id:",
        id,
      );
    }
  },

  removePattern: (id: string) => {
    const { patterns, selectedId } = get();
    const index = patterns.findIndex((p) => p.id === id);
    if (index === -1) return;

    const remaining = patterns.filter((p) => p.id !== id);
    let nextSelectedId = selectedId;

    if (selectedId === id) {
      // Select the next pattern, or the previous if removing the last one
      const nextIndex = index < remaining.length ? index : remaining.length - 1;
      nextSelectedId = remaining[nextIndex]?.id ?? null;
    }

    set({
      patterns: remaining,
      selectedId: nextSelectedId,
    });

    if (isDev) {
      console.log("[PlannerStore] Removed pattern id:", id);
    }
  },

  updatePatternOffset: (id: string, x: number, y: number) => {
    set((state) => ({
      patterns: state.patterns.map((p) =>
        p.id === id ? { ...p, offset: { x, y } } : p,
      ),
    }));
  },

  updatePatternRotation: (id: string, rotation: number) => {
    set((state) => ({
      patterns: state.patterns.map((p) =>
        p.id === id ? { ...p, rotation: rotation % 360 } : p,
      ),
    }));
  },

  clearPatterns: () => {
    set({ patterns: [], selectedId: null });
    if (isDev) {
      console.log("[PlannerStore] Cleared all patterns");
    }
  },
}));

// Selector hooks for common use cases
export const usePlannedPatterns = () =>
  usePlannerStore((state) => state.patterns);
export const useSelectedPatternId = () =>
  usePlannerStore((state) => state.selectedId);
export const useSelectedPlannedPattern = () =>
  usePlannerStore(
    useShallow(
      (state) => state.patterns.find((p) => p.id === state.selectedId) ?? null,
    ),
  );
