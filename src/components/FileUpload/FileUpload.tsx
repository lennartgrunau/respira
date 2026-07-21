/**
 * FileUpload Component
 *
 * Orchestrates file upload UI with file selection, Pyodide initialization, pattern upload, and validation
 */

import { useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useMachineStore,
  usePatternUploaded,
} from "../../stores/useMachineStore";
import { useMachineUploadStore } from "../../stores/useMachineUploadStore";
import { useMachineCacheStore } from "../../stores/useMachineCacheStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { usePlannerStore } from "../../stores/usePlannerStore";
import { useUIStore } from "../../stores/useUIStore";
import type { PesPatternData } from "../../formats/import/pesImporter";
import {
  useFileUpload,
  usePatternRotationUpload,
  usePatternValidation,
} from "@/hooks";
import { PatternInfoSkeleton } from "../SkeletonLoader";
import { PatternInfo } from "../PatternInfo";
import {
  DocumentTextIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { createFileService } from "../../platform";
import type { IFileService } from "../../platform/interfaces/IFileService";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileSelector } from "./FileSelector";
import { PyodideProgress } from "./PyodideProgress";
import { UploadButton } from "./UploadButton";
import { UploadProgress } from "./UploadProgress";
import { BoundsValidator } from "./BoundsValidator";
import { Button } from "@/components/ui/button";

export function FileUpload() {
  // Machine store
  const { isConnected, machineStatus, machineInfo } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      machineStatus: state.machineStatus,
      machineInfo: state.machineInfo,
    })),
  );

  // Machine upload store
  const { uploadProgress, isUploading, uploadPattern } = useMachineUploadStore(
    useShallow((state) => ({
      uploadProgress: state.uploadProgress,
      isUploading: state.isUploading,
      uploadPattern: state.uploadPattern,
    })),
  );

  // Machine cache store
  const { resumeAvailable, resumeFileName } = useMachineCacheStore(
    useShallow((state) => ({
      resumeAvailable: state.resumeAvailable,
      resumeFileName: state.resumeFileName,
    })),
  );

  // Pattern store (active/selected pattern)
  const {
    pesData,
    currentFileName,
    patternOffset,
    patternRotation,
    setUploadedPattern,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      currentFileName: state.currentFileName,
      patternOffset: state.patternOffset,
      patternRotation: state.patternRotation,
      setUploadedPattern: state.setUploadedPattern,
    })),
  );

  // Planner store
  const {
    patterns,
    selectedId,
    addPattern,
    selectPattern,
    removePattern,
    clearPatterns,
  } = usePlannerStore(
    useShallow((state) => ({
      patterns: state.patterns,
      selectedId: state.selectedId,
      addPattern: state.addPattern,
      selectPattern: state.selectPattern,
      removePattern: state.removePattern,
      clearPatterns: state.clearPatterns,
    })),
  );

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();

  // UI store
  const {
    pyodideReady,
    pyodideProgress,
    pyodideLoadingStep,
    initializePyodide,
  } = useUIStore(
    useShallow((state) => ({
      pyodideReady: state.pyodideReady,
      pyodideProgress: state.pyodideProgress,
      pyodideLoadingStep: state.pyodideLoadingStep,
      initializePyodide: state.initializePyodide,
    })),
  );

  const [fileService] = useState<IFileService>(() => createFileService());

  // File upload hook - handles file selection and conversion
  const { isLoading, handleFileChange } = useFileUpload({
    fileService,
    pyodideReady,
    initializePyodide,
    onFilesLoaded: useCallback(
      (files: { data: PesPatternData; name: string }[]) => {
        for (const file of files) {
          addPattern(file.data, file.name);
        }
      },
      [addPattern],
    ),
  });

  // Pattern rotation and upload hook - handles rotation transformation
  const { handleUpload: handlePatternUpload } = usePatternRotationUpload({
    uploadPattern,
    setUploadedPattern,
  });

  // Wrapper to call upload with current pattern data
  const handleUpload = useCallback(async () => {
    if (pesData && currentFileName) {
      await handlePatternUpload(
        pesData,
        currentFileName,
        patternOffset,
        patternRotation,
      );
    }
  }, [
    pesData,
    currentFileName,
    patternOffset,
    patternRotation,
    handlePatternUpload,
  ]);

  // Pattern validation hook - checks if pattern fits in hoop
  const boundsCheck = usePatternValidation({
    pesData,
    machineInfo,
    patternOffset,
    patternRotation,
  });

  const borderColor = pesData
    ? "border-secondary-600 dark:border-secondary-500"
    : "border-gray-400 dark:border-gray-600";
  const iconColor = pesData
    ? "text-secondary-600 dark:text-secondary-400"
    : "text-gray-600 dark:text-gray-400";

  const isSelectorDisabled =
    isLoading ||
    patternUploaded ||
    isUploading ||
    (uploadProgress > 0 && !patternUploaded);

  const selectedPattern = patterns.find((p) => p.id === selectedId);

  return (
    <Card className={cn("p-0 gap-0 border-l-4", borderColor)}>
      <CardContent className="p-4 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <DocumentTextIcon
            className={cn("w-6 h-6 flex-shrink-0 mt-0.5", iconColor)}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Pattern File
            </h3>
            {currentFileName ? (
              <p
                className="text-xs text-gray-600 dark:text-gray-400 truncate"
                title={currentFileName}
              >
                {currentFileName}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No pattern loaded
              </p>
            )}
          </div>
        </div>

        {resumeAvailable && resumeFileName && (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 px-3 py-2 rounded mb-3">
            <p className="text-xs text-success-800 dark:text-success-200">
              <strong>Cached:</strong> "{resumeFileName}"
            </p>
          </div>
        )}

        {isLoading && <PatternInfoSkeleton />}

        {!isLoading && selectedPattern && (
          <div className="mb-3">
            <PatternInfo pesData={selectedPattern.pesData} showThreadBlocks />
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <FileSelector
            fileService={fileService}
            isLoading={isLoading}
            isDisabled={isSelectorDisabled}
            onFileChange={handleFileChange}
            patternUploaded={patternUploaded}
          />

          <UploadButton
            pesData={pesData}
            machineStatus={machineStatus}
            isConnected={isConnected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            boundsFits={boundsCheck.fits}
            boundsError={boundsCheck.error}
            onUpload={handleUpload}
            patternUploaded={patternUploaded}
          />
        </div>

        {/* Planner pattern list */}
        {patterns.length > 0 && (
          <div className="mb-3 border rounded-md border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Planner ({patterns.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPatterns}
                disabled={isUploading || patternUploaded}
                className="h-5 px-1.5 text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"
              >
                <XMarkIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
            <ul className="max-h-40 overflow-y-auto">
              {patterns.map((pattern) => (
                <li
                  key={pattern.id}
                  className={cn(
                    "px-3 py-2 flex items-center justify-between gap-2 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-800",
                    pattern.id === selectedId
                      ? "bg-secondary-50 dark:bg-secondary-900/20 border-l-2 border-secondary-500"
                      : "border-l-2 border-transparent",
                  )}
                  onClick={() => selectPattern(pattern.id)}
                >
                  <span className="truncate flex-1" title={pattern.fileName}>
                    {pattern.fileName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePattern(pattern.id);
                    }}
                    disabled={isUploading || patternUploaded}
                    className="h-5 w-5 p-0 text-gray-500 hover:text-danger-600 hover:bg-danger-50 dark:text-gray-400 dark:hover:text-danger-400 dark:hover:bg-danger-900/20"
                    aria-label={`Remove ${pattern.fileName}`}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PyodideProgress
          pyodideReady={pyodideReady}
          pyodideProgress={pyodideProgress}
          pyodideLoadingStep={pyodideLoadingStep}
          isFileLoading={isLoading}
        />

        <BoundsValidator
          pesData={pesData}
          machineStatus={machineStatus}
          boundsError={boundsCheck.error}
        />

        <UploadProgress
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </CardContent>
    </Card>
  );
}
