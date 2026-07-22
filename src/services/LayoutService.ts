import type { SavedLayout, SavedLayoutPattern } from "../types/layout";
import { SAVED_LAYOUT_VERSION } from "../types/layout";
import type { PlannedPattern } from "../stores/usePlannerStore";

export class LayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayoutError";
  }
}

/**
 * Convert the in-memory planner patterns to a serializable layout object.
 */
export function buildSavedLayout(
  patterns: PlannedPattern[],
  selectedId: string | null,
): SavedLayout {
  return {
    version: SAVED_LAYOUT_VERSION,
    patterns: patterns.map(
      (pattern): SavedLayoutPattern => ({
        fileName: pattern.fileName,
        filePath: undefined,
        offset: { ...pattern.offset },
        rotation: pattern.rotation,
      }),
    ),
    selectedId,
  };
}

/**
 * Serialize a layout to a pretty-printed JSON string.
 */
export function serializeLayout(
  patterns: PlannedPattern[],
  selectedId: string | null,
): string {
  const layout = buildSavedLayout(patterns, selectedId);
  return JSON.stringify(layout, null, 2);
}

/**
 * Parse and validate a saved layout JSON string.
 */
export function parseLayout(json: string): SavedLayout {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new LayoutError("Layout file is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new LayoutError("Layout file must contain a JSON object");
  }

  const layout = parsed as Record<string, unknown>;

  if (layout.version !== SAVED_LAYOUT_VERSION) {
    throw new LayoutError(
      `Unsupported layout version: ${String(layout.version)}. Expected ${SAVED_LAYOUT_VERSION}.`,
    );
  }

  if (!Array.isArray(layout.patterns)) {
    throw new LayoutError("Layout file must contain a 'patterns' array");
  }

  const patterns: SavedLayoutPattern[] = [];
  for (const item of layout.patterns) {
    if (!item || typeof item !== "object") {
      throw new LayoutError("Each pattern entry must be an object");
    }

    const entry = item as Record<string, unknown>;

    if (typeof entry.fileName !== "string" || entry.fileName.length === 0) {
      throw new LayoutError(
        "Each pattern entry must have a non-empty 'fileName'",
      );
    }

    if (
      entry.filePath !== undefined &&
      (typeof entry.filePath !== "string" || entry.filePath.length === 0)
    ) {
      throw new LayoutError(
        "Pattern 'filePath' must be a non-empty string when present",
      );
    }

    if (
      !entry.offset ||
      typeof entry.offset !== "object" ||
      typeof (entry.offset as Record<string, unknown>).x !== "number" ||
      typeof (entry.offset as Record<string, unknown>).y !== "number"
    ) {
      throw new LayoutError(
        `Pattern '${entry.fileName}' must have a numeric 'offset'`,
      );
    }

    if (typeof entry.rotation !== "number") {
      throw new LayoutError(
        `Pattern '${entry.fileName}' must have a numeric 'rotation'`,
      );
    }

    patterns.push({
      fileName: entry.fileName,
      filePath: entry.filePath,
      offset: {
        x: (entry.offset as { x: number; y: number }).x,
        y: (entry.offset as { x: number; y: number }).y,
      },
      rotation: entry.rotation,
    });
  }

  return {
    version: SAVED_LAYOUT_VERSION,
    patterns,
    selectedId:
      typeof layout.selectedId === "string" ? layout.selectedId : null,
  };
}
