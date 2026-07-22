import type { IFileService } from "../interfaces/IFileService";

/**
 * Electron implementation of file service using native dialogs via IPC
 */
export class ElectronFileService implements IFileService {
  async openFileDialog(options: {
    accept: string;
    multiple?: boolean;
  }): Promise<File[]> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    try {
      const results = await window.electronAPI.invoke<Array<{
        filePath: string;
        fileName: string;
      }> | null>("dialog:openFile", {
        filters: [
          { name: "PES Files", extensions: ["pes"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: options.multiple ? ["multiSelections"] : undefined,
      });

      if (!results || results.length === 0) {
        return [];
      }

      const files: File[] = [];
      for (const result of results) {
        // Read the file content
        const buffer = await window.electronAPI.invoke<ArrayBuffer>(
          "fs:readFile",
          result.filePath,
        );
        const blob = new Blob([buffer]);
        files.push(
          new File([blob], result.fileName, {
            type: "application/octet-stream",
          }),
        );
      }

      return files;
    } catch (err) {
      console.error("[ElectronFileService] Failed to open file:", err);
      return [];
    }
  }

  async saveFileDialog(data: Uint8Array, defaultName: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    try {
      const filePath = await window.electronAPI.invoke<string | null>(
        "dialog:saveFile",
        {
          defaultPath: defaultName,
          filters: [
            { name: "PEN Files", extensions: ["pen"] },
            { name: "All Files", extensions: ["*"] },
          ],
        },
      );

      if (filePath) {
        await window.electronAPI.invoke(
          "fs:writeFile",
          filePath,
          Array.from(data),
        );
      }
    } catch (err) {
      console.error("[ElectronFileService] Failed to save file:", err);
      throw err;
    }
  }

  async saveLayoutDialog(data: string, defaultName: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    try {
      const filePath = await window.electronAPI.invoke<string | null>(
        "dialog:saveFile",
        {
          defaultPath: defaultName,
          filters: [
            { name: "Layout Files", extensions: ["layout.json"] },
            { name: "All Files", extensions: ["*"] },
          ],
        },
      );

      if (filePath) {
        const encoder = new TextEncoder();
        await window.electronAPI.invoke(
          "fs:writeFile",
          filePath,
          Array.from(encoder.encode(data)),
        );
      }
    } catch (err) {
      console.error("[ElectronFileService] Failed to save layout:", err);
      throw err;
    }
  }

  async openLayoutDialog(): Promise<{
    content: string;
    fileName: string;
  } | null> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    try {
      const results = await window.electronAPI.invoke<Array<{
        filePath: string;
        fileName: string;
      }> | null>("dialog:openFile", {
        filters: [
          { name: "Layout Files", extensions: ["layout.json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!results || results.length === 0) {
        return null;
      }

      const result = results[0];
      const buffer = await window.electronAPI.invoke<ArrayBuffer>(
        "fs:readFile",
        result.filePath,
      );
      const decoder = new TextDecoder("utf-8");
      return { content: decoder.decode(buffer), fileName: result.fileName };
    } catch (err) {
      console.error("[ElectronFileService] Failed to open layout:", err);
      return null;
    }
  }

  hasNativeDialogs(): boolean {
    return true;
  }
}
