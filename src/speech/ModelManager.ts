/**
 * On-Device Whisper Model Manager for Wini.
 * Where it fits: Manages the catalog, downloading, verification, storage,
 * and deletion of quantized ggml models for offline on-device speech recognition.
 *
 * Beginner note: Never bundle large AI models (30MB - 180MB) inside the app APK!
 * Bundling models makes the app download huge for everyone, even users who don't
 * use voice. Instead, Wini downloads the model once on demand into the app's local
 * storage directory. Once downloaded, everything runs 100% offline without internet.
 */

export type WhisperModelId = 'tiny' | 'base' | 'small';

export interface ModelCatalogEntry {
  id: WhisperModelId;
  name: string;
  filename: string;
  url: string;
  byteSize: number;
  sha256: string;
  description: string;
  isDefault?: boolean;
  isRecommended?: boolean;
}

/**
 * Official quantized multilingual ggml models verified from
 * https://huggingface.co/ggerganov/whisper.cpp
 */
export const WHISPER_MODEL_CATALOG: Record<WhisperModelId, ModelCatalogEntry> = {
  tiny: {
    id: 'tiny',
    name: 'Whisper Tiny (q5_1)',
    filename: 'ggml-tiny-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
    byteSize: 32152673, // 30.66 MB
    sha256: '3e8822ab7e529860cd1844c54901cab7615db4e74c414caf40131e17036794d3',
    description: 'Fastest & lightest. Great for quick checks and entry-level phones.',
  },
  base: {
    id: 'base',
    name: 'Whisper Base (q5_1)',
    filename: 'ggml-base-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    byteSize: 59707625, // 56.94 MB
    sha256: '1472da3b8dde27b952b515a60bbea06532be2639bcecc5a6c9dd248bed11865d',
    description: 'Default. Balanced speed, RAM usage, and accuracy for everyday voice entries.',
    isDefault: true,
  },
  small: {
    id: 'small',
    name: 'Whisper Small (q5_1)',
    filename: 'ggml-small-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    byteSize: 190085487, // 181.28 MB
    sha256: 'f4a8c6ba84184c3af18f9f63ca9f777e27d39858c1435d27b8b9239092c16c15',
    description: 'Recommended for phones with 4GB+ RAM. Highest accuracy with Indian English accents.',
    isRecommended: true,
  },
};

export interface FileInfo {
  exists: boolean;
  size?: number;
  uri?: string;
}

export interface FileSystemAdapter {
  documentDirectory: string | null;
  getInfoAsync: (fileUri: string) => Promise<FileInfo>;
  deleteAsync: (fileUri: string, options?: { idempotent?: boolean }) => Promise<void>;
  makeDirectoryAsync: (dirUri: string, options?: { intermediates?: boolean }) => Promise<void>;
  getFreeDiskStorageAsync: () => Promise<number>;
  createDownloadResumable: (
    url: string,
    fileUri: string,
    options?: any,
    callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
  ) => {
    downloadAsync: () => Promise<{ uri: string; status: number } | undefined>;
    pauseAsync?: () => Promise<any>;
    resumeAsync?: () => Promise<any>;
  };
}

function getNativeFileSystem(): FileSystemAdapter {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy');
    return {
      documentDirectory: FileSystem.documentDirectory,
      getInfoAsync: FileSystem.getInfoAsync,
      deleteAsync: FileSystem.deleteAsync,
      makeDirectoryAsync: FileSystem.makeDirectoryAsync,
      getFreeDiskStorageAsync: FileSystem.getFreeDiskStorageAsync,
      createDownloadResumable: (url, fileUri, options, callback) =>
        FileSystem.createDownloadResumable(url, fileUri, options, callback),
    };
  } catch {
    return {
      documentDirectory: null,
      getInfoAsync: async () => ({ exists: false }),
      deleteAsync: async () => {},
      makeDirectoryAsync: async () => {},
      getFreeDiskStorageAsync: async () => 1024 * 1024 * 1024,
      createDownloadResumable: () => ({
        downloadAsync: async () => ({ uri: '', status: 200 }),
      }),
    };
  }
}

export class ModelManager {
  private fs: FileSystemAdapter;

  constructor(fsAdapter?: FileSystemAdapter) {
    this.fs = fsAdapter || getNativeFileSystem();
  }

  /**
   * Returns all available model catalog entries.
   */
  getCatalog(): ModelCatalogEntry[] {
    return Object.values(WHISPER_MODEL_CATALOG);
  }

  /**
   * Gets a specific catalog entry by model id.
   */
  getModelInfo(id: WhisperModelId): ModelCatalogEntry {
    const entry = WHISPER_MODEL_CATALOG[id];
    if (!entry) {
      throw new Error(`Unknown model ID: ${id}`);
    }
    return entry;
  }

  /**
   * Directory where models are stored.
   */
  getModelDirectory(): string {
    const docDir = this.fs.documentDirectory || 'file:///data/user/0/com.prince007p.wini/files/';
    return `${docDir}whisper_models/`;
  }

  /**
   * Local file URI for a given model.
   */
  getModelPath(id: WhisperModelId): string {
    const info = this.getModelInfo(id);
    return `${this.getModelDirectory()}${info.filename}`;
  }

  /**
   * Checks whether a model is fully downloaded and valid on disk.
   */
  async isModelDownloaded(id: WhisperModelId): Promise<boolean> {
    try {
      const path = this.getModelPath(id);
      const info = await this.fs.getInfoAsync(path);
      if (!info.exists) return false;

      const expected = this.getModelInfo(id).byteSize;
      if (typeof info.size === 'number' && info.size > 0) {
        // If file size is severely truncated or mismatched, consider incomplete
        if (Math.abs(info.size - expected) > 1024) {
          return false;
        }
        return true;
      }
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the device has enough free storage space for a model download.
   */
  async checkFreeSpace(id: WhisperModelId): Promise<{
    hasSpace: boolean;
    freeBytes: number;
    requiredBytes: number;
  }> {
    const model = this.getModelInfo(id);
    // Buffer: model size + 20 MB safety margin
    const requiredBytes = model.byteSize + 20 * 1024 * 1024;
    try {
      const freeBytes = await this.fs.getFreeDiskStorageAsync();
      return {
        hasSpace: freeBytes >= requiredBytes,
        freeBytes,
        requiredBytes,
      };
    } catch {
      // If free storage cannot be queried, assume space is available
      return {
        hasSpace: true,
        freeBytes: requiredBytes * 2,
        requiredBytes,
      };
    }
  }

  /**
   * Downloads a model file with progress tracking and retry/resume support.
   */
  async downloadModel(
    id: WhisperModelId,
    onProgress?: (progressPercent: number, writtenBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const model = this.getModelInfo(id);
    const targetPath = this.getModelPath(id);
    const dir = this.getModelDirectory();

    // 1. Check free storage space
    const space = await this.checkFreeSpace(id);
    if (!space.hasSpace) {
      const freeMB = (space.freeBytes / (1024 * 1024)).toFixed(1);
      const reqMB = (space.requiredBytes / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Not enough free storage space to download ${model.name}. Need ~${reqMB} MB, but only ${freeMB} MB is available.`
      );
    }

    // 2. Ensure destination folder exists
    try {
      await this.fs.makeDirectoryAsync(dir, { intermediates: true });
    } catch {
      // Already exists
    }

    // 3. Initiate download with progress callback
    let lastProgress = 0;
    const downloadResumable = this.fs.createDownloadResumable(
      model.url,
      targetPath,
      {},
      (downloadData) => {
        const total = downloadData.totalBytesExpectedToWrite || model.byteSize;
        const written = downloadData.totalBytesWritten;
        const percent = total > 0 ? Math.min(100, Math.round((written / total) * 100)) : 0;
        lastProgress = percent;
        if (onProgress) {
          onProgress(percent, written, total);
        }
      }
    );

    let result: { uri: string; status: number } | undefined;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await downloadResumable.downloadAsync();
        if (result && result.status >= 200 && result.status < 300) {
          break;
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          // Clean up incomplete file on final failure
          try {
            await this.fs.deleteAsync(targetPath, { idempotent: true });
          } catch {
            // Ignore delete error
          }
          throw new Error(
            `Failed to download ${model.name} after ${maxAttempts} attempts: ${err.message || 'Network error'}`
          );
        }
      }
    }

    // 4. Verify downloaded file size
    const info = await this.fs.getInfoAsync(targetPath);
    if (!info.exists) {
      throw new Error(`Downloaded model file was not found at ${targetPath}`);
    }
    if (typeof info.size === 'number' && Math.abs(info.size - model.byteSize) > 2048) {
      await this.fs.deleteAsync(targetPath, { idempotent: true });
      throw new Error(
        `Downloaded file size mismatch for ${model.name} (got ${info.size} bytes, expected ${model.byteSize} bytes). File deleted.`
      );
    }

    if (onProgress && lastProgress !== 100) {
      onProgress(100, model.byteSize, model.byteSize);
    }

    return targetPath;
  }

  /**
   * Deletes a model file from device storage.
   */
  async deleteModel(id: WhisperModelId): Promise<void> {
    const path = this.getModelPath(id);
    await this.fs.deleteAsync(path, { idempotent: true });
  }

  /**
   * Returns list of all downloaded model IDs.
   */
  async getDownloadedModels(): Promise<WhisperModelId[]> {
    const result: WhisperModelId[] = [];
    for (const key of Object.keys(WHISPER_MODEL_CATALOG) as WhisperModelId[]) {
      if (await this.isModelDownloaded(key)) {
        result.push(key);
      }
    }
    return result;
  }
}

export const defaultModelManager = new ModelManager();
