import { useCallback } from "react";
import {
  convertPesToPen,
  type PesPatternData,
} from "../../formats/import/pesImporter";
import type { SavedLayout, SavedLayoutPattern } from "../../types/layout";
import type { IFileService } from "../../platform/interfaces/IFileService";
import type { PlannedPattern } from "../../stores/usePlannerStore";

export interface LayoutFileResolution {
  layoutEntry: SavedLayoutPattern;
  file: File;
}

export interface LayoutLoadResult {
  loaded: PlannedPattern[];
  missing: SavedLayoutPattern[];
}

export interface UseLayoutLoaderParams {
  fileService: IFileService;
  pyodideReady: boolean;
  initializePyodide: () => Promise<void>;
  addPattern: (data: PesPatternData, fileName: string) => string;
  updatePatternOffset: (id: string, x: number, y: number) => void;
  updatePatternRotation: (id: string, rotation: number) => void;
  selectPattern: (id: string) => void;
  clearPatterns: () => void;
}

/**
 * Resolve .pes files referenced by a saved layout.
 *
 * - In Electron, tries each saved filePath first, then prompts once for any
 *   missing files and matches them by filename.
 * - In the browser, prompts once for all referenced files and matches by filename.
 */
async function resolveLayoutFiles(
  fileService: IFileService,
  layout: SavedLayout,
): Promise<{
  resolved: LayoutFileResolution[];
  missing: SavedLayoutPattern[];
}> {
  const resolved: LayoutFileResolution[] = [];
  const missing: SavedLayoutPattern[] = [];

  if (fileService.hasNativeDialogs()) {
    // Electron: try saved paths first
    for (const entry of layout.patterns) {
      if (entry.filePath) {
        try {
          const buffer = await window.electronAPI?.invoke<ArrayBuffer>(
            "fs:readFile",
            entry.filePath,
          );
          if (buffer) {
            const blob = new Blob([buffer]);
            resolved.push({
              layoutEntry: entry,
              file: new File([blob], entry.fileName, {
                type: "application/octet-stream",
              }),
            });
            continue;
          }
        } catch {
          // fall through to missing list
        }
      }
      missing.push(entry);
    }
  } else {
    // Browser: cannot use saved paths, all are missing initially
    missing.push(...layout.patterns);
  }

  if (missing.length > 0) {
    const pickedFiles = await fileService.openFileDialog({
      accept: ".pes",
      multiple: true,
    });

    // Match picked files to missing layout entries by filename.
    // Use a copy so duplicate filenames can be matched by order.
    const remainingPicked = [...pickedFiles];
    const stillMissing: SavedLayoutPattern[] = [];

    for (const entry of missing) {
      const matchIndex = remainingPicked.findIndex(
        (file) => file.name === entry.fileName,
      );
      if (matchIndex !== -1) {
        const [file] = remainingPicked.splice(matchIndex, 1);
        resolved.push({ layoutEntry: entry, file });
      } else {
        stillMissing.push(entry);
      }
    }

    missing.splice(0, missing.length, ...stillMissing);
  }

  return { resolved, missing };
}

/**
 * Hook for loading a saved layout into the planner.
 */
export function useLayoutLoader({
  fileService,
  pyodideReady,
  initializePyodide,
  addPattern,
  updatePatternOffset,
  updatePatternRotation,
  selectPattern,
  clearPatterns,
}: UseLayoutLoaderParams) {
  const loadLayout = useCallback(
    async (layout: SavedLayout): Promise<LayoutLoadResult> => {
      if (!pyodideReady) {
        await initializePyodide();
      }

      const { resolved, missing } = await resolveLayoutFiles(
        fileService,
        layout,
      );

      if (resolved.length === 0) {
        return { loaded: [], missing };
      }

      // Clear existing planner patterns before loading the saved layout
      clearPatterns();

      const loaded: PlannedPattern[] = [];
      for (const { layoutEntry, file } of resolved) {
        try {
          const data = await convertPesToPen(file);
          const id = addPattern(data, layoutEntry.fileName);

          // Apply saved offset/rotation
          updatePatternOffset(id, layoutEntry.offset.x, layoutEntry.offset.y);
          updatePatternRotation(id, layoutEntry.rotation);

          loaded.push({
            id,
            fileName: layoutEntry.fileName,
            pesData: data,
            offset: layoutEntry.offset,
            rotation: layoutEntry.rotation,
          });
        } catch (err) {
          console.error(
            "[LayoutLoader] Failed to convert PES file:",
            layoutEntry.fileName,
            err,
          );
          missing.push(layoutEntry);
        }
      }

      // Restore selected pattern if possible
      if (
        layout.selectedId &&
        loaded.some((pattern) => pattern.id === layout.selectedId)
      ) {
        selectPattern(layout.selectedId);
      } else if (loaded.length > 0) {
        selectPattern(loaded[0].id);
      }

      return { loaded, missing };
    },
    [
      fileService,
      pyodideReady,
      initializePyodide,
      addPattern,
      updatePatternOffset,
      updatePatternRotation,
      selectPattern,
      clearPatterns,
    ],
  );

  return { loadLayout };
}
