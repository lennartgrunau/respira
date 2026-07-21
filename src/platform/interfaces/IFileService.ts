export interface IFileService {
  /**
   * Open file picker and return selected File objects
   * @param options File picker options (e.g., accept filter, multiple selection)
   * @returns Array of selected Files, empty array if cancelled
   */
  openFileDialog(options: {
    accept: string;
    multiple?: boolean;
  }): Promise<File[]>;

  /**
   * Save file with native dialog (Electron only, no-op in browser)
   * @param data File data as Uint8Array
   * @param defaultName Default filename
   */
  saveFileDialog(data: Uint8Array, defaultName: string): Promise<void>;

  /**
   * Check if native file dialogs are available
   * @returns true if running in Electron with native dialogs, false otherwise
   */
  hasNativeDialogs(): boolean;
}
