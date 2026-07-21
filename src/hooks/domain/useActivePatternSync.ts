import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "../../stores/usePlannerStore";
import { usePatternStore } from "../../stores/usePatternStore";

/**
 * Keeps the single active pattern in `usePatternStore` in sync with the selected
 * pattern in `usePlannerStore`.
 *
 * - When the selected planned pattern changes, its data, offset, and rotation are
 *   copied into `usePatternStore` so the existing upload/canvas/validation code
 *   continues to work unchanged.
 * - When the active pattern's offset/rotation changes in `usePatternStore`
 *   (e.g. via canvas drag/rotate), the change is written back to the planner
 *   entry so each pattern remembers its own layout.
 *
 * This hook should be mounted once near the root of the app (e.g. in App.tsx).
 */
export function useActivePatternSync() {
  const { patterns, selectedId } = usePlannerStore(
    useShallow((state) => ({
      patterns: state.patterns,
      selectedId: state.selectedId,
    })),
  );

  const {
    pesData,
    patternOffset,
    patternRotation,
    patternUploaded,
    setPattern,
    clearPattern,
    setPatternOffset,
    setPatternRotation,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      patternOffset: state.patternOffset,
      patternRotation: state.patternRotation,
      patternUploaded: state.patternUploaded,
      setPattern: state.setPattern,
      clearPattern: state.clearPattern,
      setPatternOffset: state.setPatternOffset,
      setPatternRotation: state.setPatternRotation,
    })),
  );

  const selectedPattern = patterns.find((p) => p.id === selectedId) ?? null;

  // Track last synced selection to avoid redundant setPattern calls
  const lastSelectedIdRef = useRef<string | null>(null);

  // Sync planner selection -> pattern store
  useEffect(() => {
    if (patternUploaded) return;

    if (!selectedPattern) {
      if (pesData) {
        // Clear pattern store when no pattern is selected and nothing is uploaded
        clearPattern();
      }
      lastSelectedIdRef.current = null;
      return;
    }

    if (lastSelectedIdRef.current === selectedPattern.id) return;

    // Load selected pattern into the active pattern store and restore its layout.
    // setPattern resets offset/rotation, so we restore them afterwards.
    setPattern(selectedPattern.pesData, selectedPattern.fileName);
    setPatternOffset(selectedPattern.offset.x, selectedPattern.offset.y);
    setPatternRotation(selectedPattern.rotation);

    lastSelectedIdRef.current = selectedPattern.id;
  }, [
    selectedPattern,
    patternUploaded,
    pesData,
    setPattern,
    clearPattern,
    setPatternOffset,
    setPatternRotation,
  ]);

  // Sync pattern store offset/rotation -> planner
  useEffect(() => {
    if (patternUploaded || !selectedPattern) return;

    if (
      selectedPattern.offset.x !== patternOffset.x ||
      selectedPattern.offset.y !== patternOffset.y
    ) {
      usePlannerStore
        .getState()
        .updatePatternOffset(
          selectedPattern.id,
          patternOffset.x,
          patternOffset.y,
        );
    }

    const normalizedRotation = ((patternRotation % 360) + 360) % 360;
    const selectedNormalized = ((selectedPattern.rotation % 360) + 360) % 360;
    if (selectedNormalized !== normalizedRotation) {
      usePlannerStore
        .getState()
        .updatePatternRotation(selectedPattern.id, patternRotation);
    }
  }, [patternOffset, patternRotation, selectedPattern, patternUploaded]);
}

export default useActivePatternSync;
