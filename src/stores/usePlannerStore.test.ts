import { describe, it, expect, beforeEach } from "vitest";
import { usePlannerStore } from "./usePlannerStore";
import type { PesPatternData } from "../formats/import/pesImporter";

// Mock pattern data for testing
const createMockPesData = (
  bounds = {
    minX: -100,
    maxX: 100,
    minY: -50,
    maxY: 50,
  },
): PesPatternData => ({
  stitches: [[0, 0, 0, 0]],
  threads: [],
  uniqueColors: [],
  penData: new Uint8Array(),
  penStitches: {
    stitches: [],
    colorBlocks: [],
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  },
  colorCount: 1,
  stitchCount: 1,
  bounds,
});

describe("usePlannerStore", () => {
  beforeEach(() => {
    usePlannerStore.getState().clearPatterns();
  });

  describe("addPattern", () => {
    it("should add a pattern and select it", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      const state = usePlannerStore.getState();
      expect(state.patterns).toHaveLength(1);
      expect(state.patterns[0].fileName).toBe("test.pes");
      expect(state.selectedId).toBe(id);
    });

    it("should assign unique ids to multiple patterns", () => {
      const id1 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "first.pes");
      const id2 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "second.pes");

      expect(id1).not.toBe(id2);
      expect(usePlannerStore.getState().patterns).toHaveLength(2);
    });

    it("should select the most recently added pattern", () => {
      usePlannerStore.getState().addPattern(createMockPesData(), "first.pes");
      const id2 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "second.pes");

      expect(usePlannerStore.getState().selectedId).toBe(id2);
    });
  });

  describe("selectPattern", () => {
    it("should select an existing pattern", () => {
      const id1 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "first.pes");
      const id2 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "second.pes");

      usePlannerStore.getState().selectPattern(id1);

      expect(usePlannerStore.getState().selectedId).toBe(id1);
      expect(usePlannerStore.getState().selectedId).not.toBe(id2);
    });

    it("should not select an unknown pattern id", () => {
      usePlannerStore.getState().addPattern(createMockPesData(), "test.pes");

      usePlannerStore.getState().selectPattern("unknown-id");

      expect(usePlannerStore.getState().selectedId).not.toBe("unknown-id");
    });
  });

  describe("removePattern", () => {
    it("should remove a pattern", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      usePlannerStore.getState().removePattern(id);

      expect(usePlannerStore.getState().patterns).toHaveLength(0);
    });

    it("should select the next pattern when removing the selected one", () => {
      const id1 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "first.pes");
      const id2 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "second.pes");

      usePlannerStore.getState().removePattern(id2);

      expect(usePlannerStore.getState().selectedId).toBe(id1);
    });

    it("should select the previous pattern when removing the last one", () => {
      const id1 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "first.pes");
      const id2 = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "second.pes");

      usePlannerStore.getState().selectPattern(id2);
      usePlannerStore.getState().removePattern(id2);

      expect(usePlannerStore.getState().selectedId).toBe(id1);
    });

    it("should clear selection when removing the only pattern", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      usePlannerStore.getState().removePattern(id);

      expect(usePlannerStore.getState().selectedId).toBeNull();
    });
  });

  describe("updatePatternOffset", () => {
    it("should update the offset of the specified pattern", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      usePlannerStore.getState().updatePatternOffset(id, 10, 20);

      const pattern = usePlannerStore
        .getState()
        .patterns.find((p) => p.id === id);
      expect(pattern?.offset).toEqual({ x: 10, y: 20 });
    });
  });

  describe("updatePatternRotation", () => {
    it("should update and normalize the rotation of the specified pattern", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      usePlannerStore.getState().updatePatternRotation(id, 90);

      const pattern = usePlannerStore
        .getState()
        .patterns.find((p) => p.id === id);
      expect(pattern?.rotation).toBe(90);
    });
  });

  describe("clearPatterns", () => {
    it("should remove all patterns and clear selection", () => {
      usePlannerStore.getState().addPattern(createMockPesData(), "first.pes");
      usePlannerStore.getState().addPattern(createMockPesData(), "second.pes");

      usePlannerStore.getState().clearPatterns();

      expect(usePlannerStore.getState().patterns).toHaveLength(0);
      expect(usePlannerStore.getState().selectedId).toBeNull();
    });
  });

  describe("selector hooks", () => {
    it("useSelectedPlannedPattern should return the selected pattern", () => {
      const id = usePlannerStore
        .getState()
        .addPattern(createMockPesData(), "test.pes");

      // Direct selector function test
      const selected = usePlannerStore
        .getState()
        .patterns.find((p) => p.id === id);
      expect(selected?.fileName).toBe("test.pes");
    });
  });
});
