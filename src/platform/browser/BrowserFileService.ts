import type { IFileService } from "../interfaces/IFileService";

/**
 * Browser implementation of file service using HTML input elements
 */
export class BrowserFileService implements IFileService {
  async openFileDialog(options: {
    accept: string;
    multiple?: boolean;
  }): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = options.accept;
      input.multiple = options.multiple ?? false;

      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        resolve(files ? Array.from(files) : []);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  async saveFileDialog(): Promise<void> {
    // No-op in browser - could implement download if needed in the future
    console.warn("saveFileDialog not implemented in browser");
  }

  async saveLayoutDialog(data: string, defaultName: string): Promise<void> {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async openLayoutDialog(): Promise<{
    content: string;
    fileName: string;
  } | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".layout.json,application/json";

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const content = await file.text();
        resolve({ content, fileName: file.name });
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  hasNativeDialogs(): boolean {
    return false;
  }
}
