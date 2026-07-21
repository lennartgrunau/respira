import { useState, useCallback } from "react";
import {
  convertPesToPen,
  type PesPatternData,
} from "../../formats/import/pesImporter";
import type { IFileService } from "../../platform/interfaces/IFileService";

export interface LoadedFile {
  data: PesPatternData;
  name: string;
}

export interface UseFileUploadParams {
  fileService: IFileService;
  pyodideReady: boolean;
  initializePyodide: () => Promise<void>;
  onFilesLoaded: (files: LoadedFile[]) => void;
}

export interface UseFileUploadReturn {
  isLoading: boolean;
  handleFileChange: (
    event?: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
}

/**
 * Custom hook for handling file upload and PES to PEN conversion
 *
 * Manages file selection (native dialog or browser input), Pyodide initialization,
 * PES file conversion, and error handling. Supports selecting multiple files at once.
 *
 * @param params - File service, Pyodide state, and callback
 * @returns Loading state and file change handler
 */
export function useFileUpload({
  fileService,
  pyodideReady,
  initializePyodide,
  onFilesLoaded,
}: UseFileUploadParams): UseFileUploadReturn {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback(
    async (event?: React.ChangeEvent<HTMLInputElement>) => {
      setIsLoading(true);
      try {
        // Wait for Pyodide if it's still loading
        if (!pyodideReady) {
          console.log("[FileUpload] Waiting for Pyodide to finish loading...");
          await initializePyodide();
          console.log("[FileUpload] Pyodide ready");
        }

        let files: File[] = [];

        // In Electron, use native file dialogs
        if (fileService.hasNativeDialogs()) {
          files = await fileService.openFileDialog({
            accept: ".pes",
            multiple: true,
          });
        } else {
          // In browser, use the input element
          const inputFiles = event?.target.files;
          files = inputFiles ? Array.from(inputFiles) : [];
        }

        if (files.length === 0) {
          setIsLoading(false);
          return;
        }

        const loadedFiles: LoadedFile[] = [];
        for (const file of files) {
          const data = await convertPesToPen(file);
          loadedFiles.push({ data, name: file.name });
        }

        onFilesLoaded(loadedFiles);
      } catch (err) {
        alert(
          `Failed to load PES file: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [fileService, pyodideReady, initializePyodide, onFilesLoaded],
  );

  return {
    isLoading,
    handleFileChange,
  };
}
