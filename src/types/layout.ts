/**
 * Saved layout file format
 *
 * A layout file stores only file references and per-pattern layout metadata,
 * not the PES data itself. Loading requires the original .pes files to be
 * available again.
 */

export interface SavedLayoutPattern {
  fileName: string;
  /** Absolute path to the .pes file. Only available in Electron builds. */
  filePath?: string;
  offset: { x: number; y: number };
  rotation: number;
}

export interface SavedLayout {
  version: number;
  patterns: SavedLayoutPattern[];
  /** ID of the pattern that was selected when the layout was saved. */
  selectedId: string | null;
}

export const SAVED_LAYOUT_VERSION = 1;
