/**
 * Unit tests for On-Device Whisper Engine, Model Manager, and Fallbacks.
 * Tests:
 * 1. Engine selection logic in SpeechServiceFactory
 * 2. Automatic fallback behavior when model is missing or fails
 * 3. ModelManager catalog, free space check, download progress, and deletion using a fake filesystem
 * 4. Custom prompt building for Whisper finance bias
 * 5. FakeSpeechService interface compatibility
 */

import {
  ModelManager,
  FileSystemAdapter,
  WHISPER_MODEL_CATALOG,
} from '../ModelManager';
import { buildWhisperPrompt, WhisperSpeechService } from '../WhisperSpeechService';
import { createSpeechService } from '../SpeechServiceFactory';
import { FakeSpeechService } from '../FakeSpeechService';
import { ExpoSpeechService } from '../ExpoSpeechService';

describe('Whisper ModelManager (with fake filesystem)', () => {
  let fakeFiles: Record<string, { size: number; content?: string }> = {};
  let freeStorageBytes = 500 * 1024 * 1024; // 500 MB free
  let downloadFailuresRemaining = 0;

  const fakeFs: FileSystemAdapter = {
    documentDirectory: 'file:///mock/app/files/',
    getInfoAsync: async (uri: string) => {
      const file = fakeFiles[uri];
      if (file) {
        return { exists: true, size: file.size, uri };
      }
      return { exists: false };
    },
    deleteAsync: async (uri: string) => {
      delete fakeFiles[uri];
    },
    makeDirectoryAsync: async (_uri: string) => {
      // no-op in mock
    },
    getFreeDiskStorageAsync: async () => freeStorageBytes,
    createDownloadResumable: (url, fileUri, _options, onProgress) => ({
      downloadAsync: async () => {
        if (downloadFailuresRemaining > 0) {
          downloadFailuresRemaining--;
          throw new Error('Network connection dropped');
        }
        // Find expected size from catalog
        const match = Object.values(WHISPER_MODEL_CATALOG).find((m) => m.url === url);
        const size = match ? match.byteSize : 1000;
        // Simulate progress callback
        if (onProgress) {
          onProgress({ totalBytesWritten: Math.round(size / 2), totalBytesExpectedToWrite: size });
          onProgress({ totalBytesWritten: size, totalBytesExpectedToWrite: size });
        }
        fakeFiles[fileUri] = { size };
        return { uri: fileUri, status: 200 };
      },
    }),
  };

  beforeEach(() => {
    fakeFiles = {};
    freeStorageBytes = 500 * 1024 * 1024;
    downloadFailuresRemaining = 0;
  });

  test('catalog contains valid tiny, base, and small models with verified metadata', () => {
    const manager = new ModelManager(fakeFs);
    const catalog = manager.getCatalog();
    expect(catalog.length).toBe(3);

    const base = manager.getModelInfo('base');
    expect(base.name).toContain('Base');
    expect(base.isDefault).toBe(true);
    expect(base.byteSize).toBe(59707625);
    expect(base.url).toContain('ggml-base-q5_1.bin');

    const tiny = manager.getModelInfo('tiny');
    expect(tiny.byteSize).toBe(32152673);

    const small = manager.getModelInfo('small');
    expect(small.byteSize).toBe(190085487);
    expect(small.isRecommended).toBe(true);
  });

  test('getModelInfo throws for unknown model ID', () => {
    const manager = new ModelManager(fakeFs);
    expect(() => manager.getModelInfo('unknown' as any)).toThrow('Unknown model ID');
  });

  test('getModelPath and getModelDirectory form correct local file URIs', () => {
    const manager = new ModelManager(fakeFs);
    expect(manager.getModelDirectory()).toBe('file:///mock/app/files/whisper_models/');
    expect(manager.getModelPath('base')).toBe('file:///mock/app/files/whisper_models/ggml-base-q5_1.bin');
  });

  test('isModelDownloaded returns false when file does not exist', async () => {
    const manager = new ModelManager(fakeFs);
    const downloaded = await manager.isModelDownloaded('base');
    expect(downloaded).toBe(false);
  });

  test('isModelDownloaded returns true only when file exists and size matches expected', async () => {
    const manager = new ModelManager(fakeFs);
    const basePath = manager.getModelPath('base');

    // Incomplete file (truncated)
    fakeFiles[basePath] = { size: 1024 };
    expect(await manager.isModelDownloaded('base')).toBe(false);

    // Complete file
    fakeFiles[basePath] = { size: WHISPER_MODEL_CATALOG.base.byteSize };
    expect(await manager.isModelDownloaded('base')).toBe(true);
  });

  test('checkFreeSpace verifies sufficient storage with safety buffer', async () => {
    const manager = new ModelManager(fakeFs);

    // 500 MB free -> plenty of space for base model (~57MB + 20MB buffer = ~77MB)
    const spaceOk = await manager.checkFreeSpace('base');
    expect(spaceOk.hasSpace).toBe(true);
    expect(spaceOk.freeBytes).toBe(500 * 1024 * 1024);

    // Only 10 MB free -> not enough space
    freeStorageBytes = 10 * 1024 * 1024;
    const spaceLow = await manager.checkFreeSpace('base');
    expect(spaceLow.hasSpace).toBe(false);
  });

  test('downloadModel throws error if storage is insufficient before download', async () => {
    freeStorageBytes = 5 * 1024 * 1024; // 5 MB
    const manager = new ModelManager(fakeFs);

    await expect(manager.downloadModel('base')).rejects.toThrow('Not enough free storage space');
    expect(fakeFiles[manager.getModelPath('base')]).toBeUndefined();
  });

  test('downloadModel tracks progress and successfully saves valid model', async () => {
    const manager = new ModelManager(fakeFs);
    const progressList: number[] = [];

    const path = await manager.downloadModel('tiny', (percent) => {
      progressList.push(percent);
    });

    expect(path).toBe(manager.getModelPath('tiny'));
    expect(await manager.isModelDownloaded('tiny')).toBe(true);
    expect(progressList).toContain(100);
  });

  test('deleteModel removes model from local storage', async () => {
    const manager = new ModelManager(fakeFs);
    const path = manager.getModelPath('base');
    fakeFiles[path] = { size: WHISPER_MODEL_CATALOG.base.byteSize };

    expect(await manager.isModelDownloaded('base')).toBe(true);
    await manager.deleteModel('base');
    expect(await manager.isModelDownloaded('base')).toBe(false);
  });
});

describe('Whisper Prompt Building', () => {
  test('buildWhisperPrompt includes baseline expense samples and default categories', () => {
    const prompt = buildWhisperPrompt();
    expect(prompt).toContain('add 10 rupees rickshaw');
    expect(prompt).toContain('chai 20 rupees');
    expect(prompt).toContain('kal 100 petrol');
    expect(prompt).toContain('parso metro 50');
    expect(prompt).toContain('Categories: Food, Transport, Shopping');
  });

  test('buildWhisperPrompt incorporates custom categories and learned keywords', () => {
    const prompt = buildWhisperPrompt({
      categories: ['Groceries', 'Utilities', 'Snacks'],
      learnedKeywords: ['bhelpuri', 'swiggy', 'dosa'],
    });

    expect(prompt).toContain('Categories: Groceries, Utilities, Snacks.');
    expect(prompt).toContain('Vocabulary: bhelpuri, swiggy, dosa.');
  });
});

describe('SpeechServiceFactory & Fallback Logic', () => {
  let fakeFiles: Record<string, { size: number }> = {};

  const fakeFs: FileSystemAdapter = {
    documentDirectory: 'file:///mock/app/files/',
    getInfoAsync: async (uri: string) => {
      const file = fakeFiles[uri];
      return file ? { exists: true, size: file.size, uri } : { exists: false };
    },
    deleteAsync: async () => {},
    makeDirectoryAsync: async () => {},
    getFreeDiskStorageAsync: async () => 1024 * 1024 * 1024,
    createDownloadResumable: () => ({
      downloadAsync: async () => ({ uri: '', status: 200 }),
    }),
  };

  beforeEach(() => {
    fakeFiles = {};
  });

  test('creates ExpoSpeechService by default when engine is expo', async () => {
    const manager = new ModelManager(fakeFs);
    const result = await createSpeechService({
      engine: 'expo',
      modelManager: manager,
    });

    expect(result.selectedEngine).toBe('expo');
    expect(result.service).toBeInstanceOf(ExpoSpeechService);
    expect(result.fallbackReason).toBeUndefined();
  });

  test('falls back automatically to ExpoSpeechService if Whisper model is not downloaded', async () => {
    const manager = new ModelManager(fakeFs);
    let fallbackCalledWith = '';

    const result = await createSpeechService({
      engine: 'whisper',
      whisperModelId: 'base',
      modelManager: manager,
      onFallback: (reason) => {
        fallbackCalledWith = reason;
      },
    });

    expect(result.selectedEngine).toBe('expo');
    expect(result.service).toBeInstanceOf(ExpoSpeechService);
    expect(result.fallbackReason).toContain('Whisper model "Whisper Base (q5_1)" is not downloaded yet');
    expect(fallbackCalledWith).toBe(result.fallbackReason);
  });

  test('instantiates WhisperSpeechService when requested model is downloaded', async () => {
    const manager = new ModelManager(fakeFs);
    const basePath = manager.getModelPath('base');
    fakeFiles[basePath] = { size: WHISPER_MODEL_CATALOG.base.byteSize };

    const result = await createSpeechService({
      engine: 'whisper',
      whisperModelId: 'base',
      modelManager: manager,
    });

    expect(result.selectedEngine).toBe('whisper');
    expect(result.service).toBeInstanceOf(WhisperSpeechService);
    expect(result.fallbackReason).toBeUndefined();
  });
});

describe('FakeSpeechService Verification', () => {
  test('FakeSpeechService implements SpeechService contract and emits transcript events', async () => {
    const service = new FakeSpeechService();
    expect(service.engineName).toBe('fake');

    let state = '';
    let partial = '';
    let final = '';

    await service.startListening({
      onStateChange: (s) => {
        state = s;
      },
      onPartialTranscript: (t) => {
        partial = t;
      },
      onFinalTranscript: (t) => {
        final = t;
      },
    });

    expect(state).toBe('listening');

    service.emitPartialTranscript('chai');
    expect(partial).toBe('chai');

    service.emitFinalTranscript('chai 20 rupees');
    expect(final).toBe('chai 20 rupees');

    await service.stopListening();
    expect(state).toBe('idle');
  });

  test('FakeSpeechService handles error simulation', async () => {
    const service = new FakeSpeechService();
    let errorMessage = '';

    await service.startListening({
      onError: (msg) => {
        errorMessage = msg;
      },
    });

    service.emitError('Microphone permission denied', 'permission_denied');
    expect(errorMessage).toBe('Microphone permission denied');
  });
});
