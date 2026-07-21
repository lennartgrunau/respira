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

  hasNativeDialogs(): boolean {
    return false;
  }
}
