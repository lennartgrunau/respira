import { describe, it, expect } from "vitest";
import {
  buildSavedLayout,
  serializeLayout,
  parseLayout,
  LayoutError,
} from "./LayoutService";
import type { PlannedPattern } from "../stores/usePlannerStore";
import { SAVED_LAYOUT_VERSION } from "../types/layout";

const createMockPattern = (
  id: string,
  fileName: string,
  overrides?: Partial<PlannedPattern>,
): PlannedPattern => ({
  id,
  fileName,
  pesData: {
    stitches: [[0, 0, 0, 0]],
    threads: [],
    uniqueColors: [],
    penData: new Uint8Array([1, 2, 3]),
    penStitches: {
      stitches: [],
      colorBlocks: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    },
    colorCount: 1,
    stitchCount: 1,
    bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
  },
  offset: { x: 0, y: 0 },
  rotation: 0,
  ...overrides,
});

describe("LayoutService", () => {
  describe("buildSavedLayout", () => {
    it("should convert planned patterns to a saved layout", () => {
      const patterns = [
        createMockPattern("a", "first.pes", {
          offset: { x: 10, y: 20 },
          rotation: 45,
        }),
        createMockPattern("b", "second.pes", {
          offset: { x: -5, y: 0 },
          rotation: 90,
        }),
      ];

      const layout = buildSavedLayout(patterns, "a");

      expect(layout.version).toBe(SAVED_LAYOUT_VERSION);
      expect(layout.selectedId).toBe("a");
      expect(layout.patterns).toHaveLength(2);
      expect(layout.patterns[0]).toEqual({
        fileName: "first.pes",
        filePath: undefined,
        offset: { x: 10, y: 20 },
        rotation: 45,
      });
      expect(layout.patterns[1]).toEqual({
        fileName: "second.pes",
        filePath: undefined,
        offset: { x: -5, y: 0 },
        rotation: 90,
      });
    });

    it("should not include pesData in the saved layout", () => {
      const pattern = createMockPattern("a", "test.pes");

      const layout = buildSavedLayout([pattern], "a");

      expect(layout.patterns[0]).not.toHaveProperty("pesData");
      expect(layout.patterns[0]).not.toHaveProperty("id");
    });
  });

  describe("serializeLayout", () => {
    it("should produce valid JSON", () => {
      const pattern = createMockPattern("a", "test.pes");

      const json = serializeLayout([pattern], "a");

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe("parseLayout", () => {
    it("should parse a valid layout", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: [
          {
            fileName: "test.pes",
            filePath: "/path/to/test.pes",
            offset: { x: 1, y: 2 },
            rotation: 30,
          },
        ],
        selectedId: "abc",
      };

      const parsed = parseLayout(JSON.stringify(layout));

      expect(parsed).toEqual(layout);
    });

    it("should accept null selectedId", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: [],
        selectedId: null,
      };

      const parsed = parseLayout(JSON.stringify(layout));

      expect(parsed.selectedId).toBeNull();
    });

    it("should throw on invalid JSON", () => {
      expect(() => parseLayout("not json")).toThrow(LayoutError);
    });

    it("should throw on unsupported version", () => {
      const layout = {
        version: 99,
        patterns: [],
        selectedId: null,
      };

      expect(() => parseLayout(JSON.stringify(layout))).toThrow(LayoutError);
    });

    it("should throw when patterns is not an array", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: "nope",
        selectedId: null,
      };

      expect(() => parseLayout(JSON.stringify(layout))).toThrow(LayoutError);
    });

    it("should throw when a pattern is missing fileName", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: [{ offset: { x: 0, y: 0 }, rotation: 0 }],
        selectedId: null,
      };

      expect(() => parseLayout(JSON.stringify(layout))).toThrow(LayoutError);
    });

    it("should throw when offset is invalid", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: [
          { fileName: "test.pes", offset: { x: "bad", y: 0 }, rotation: 0 },
        ],
        selectedId: null,
      };

      expect(() => parseLayout(JSON.stringify(layout))).toThrow(LayoutError);
    });

    it("should throw when rotation is invalid", () => {
      const layout = {
        version: SAVED_LAYOUT_VERSION,
        patterns: [
          { fileName: "test.pes", offset: { x: 0, y: 0 }, rotation: "bad" },
        ],
        selectedId: null,
      };

      expect(() => parseLayout(JSON.stringify(layout))).toThrow(LayoutError);
    });

    it("should round-trip through serialize and parse", () => {
      const patterns = [
        createMockPattern("id-1", "first.pes", {
          offset: { x: 15, y: -25 },
          rotation: 180,
        }),
      ];

      const json = serializeLayout(patterns, "id-1");
      const parsed = parseLayout(json);

      expect(parsed.version).toBe(SAVED_LAYOUT_VERSION);
      expect(parsed.selectedId).toBe("id-1");
      expect(parsed.patterns).toEqual([
        {
          fileName: "first.pes",
          filePath: undefined,
          offset: { x: 15, y: -25 },
          rotation: 180,
        },
      ]);
    });
  });
});
