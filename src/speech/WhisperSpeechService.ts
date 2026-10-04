/**
 * On-Device Whisper Speech Recognition Service for Wini.
 * Where it fits: Implements `SpeechService` contract using local Whisper.rn engine
 * and Audio recording. Audio never leaves the phone—100% private and offline.
 *
 * Beginner note: Whisper is OpenAI's state-of-the-art automatic speech recognition
 * (ASR) neural network. By running a quantized GGML version directly on your phone's CPU,
 * Wini can transcribe spoken voice even in airplane mode with zero external network calls!
 */

import {
  SpeechService,
  SpeechServiceCallbacks,
  SpeechState,
} from './SpeechService';
import { WhisperModelId, defaultModelManager, ModelManager } from './ModelManager';

// Safe lazy imports so Jest / node test runners don't fail on native ESM packages
let AppState: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppState = require('react-native').AppState;
} catch {
  AppState = {
    addEventListener: () => ({ remove: () => {} }),
  };
}

let Audio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Audio = require('expo-av').Audio;
} catch {
  Audio = {
    AndroidOutputFormat: { DEFAULT: 0 },
    AndroidAudioEncoder: { DEFAULT: 0 },
    IOSAudioQuality: { HIGH: 0 },
    Recording: class {
      prepareToRecordAsync = async () => {};
      startAsync = async () => {};
      stopAndUnloadAsync = async () => {};
      getURI = () => 'file:///mock/audio.wav';
    },
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    setAudioModeAsync: async () => {},
  };
}

// Lazy import whisper.rn to avoid crash if native module isn't loaded in test/web
let initWhisperFn: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const whisperModule = require('whisper.rn');
  initWhisperFn = whisperModule.initWhisper;
} catch {
  // Ignored in mock environments
}

export interface WhisperServiceOptions {
  modelId?: WhisperModelId;
  modelManager?: ModelManager;
  language?: string; // 'en' (default) or 'auto'
  prompt?: string;
  categories?: string[];
  learnedKeywords?: string[];
}

/**
 * Builds an optimal Whisper initial prompt incorporating user vocabulary
 * and sample commands to bias decoding towards finance terminology.
 */
export function buildWhisperPrompt(vocabulary?: {
  categories?: string[];
  learnedKeywords?: string[];
}): string {
  const parts: string[] = [
    'add 10 rupees rickshaw. chai 20 rupees. kal 100 petrol. parso metro 50. 200 groceries. 350 lunch.',
  ];

  if (vocabulary?.categories && vocabulary.categories.length > 0) {
    parts.push(`Categories: ${vocabulary.categories.join(', ')}.`);
  } else {
    parts.push('Categories: Food, Transport, Shopping, Bills, Health, Fun.');
  }

  if (vocabulary?.learnedKeywords && vocabulary.learnedKeywords.length > 0) {
    const sample = vocabulary.learnedKeywords.slice(0, 30);
    parts.push(`Vocabulary: ${sample.join(', ')}.`);
  }

  return parts.join(' ');
}

// 16 kHz mono 16-bit PCM WAV configuration required by Whisper
const WHISPER_RECORDING_OPTIONS: any = {
  android: {
    extension: '.wav',
    outputFormat: Audio?.AndroidOutputFormat?.DEFAULT ?? 0,
    audioEncoder: Audio?.AndroidAudioEncoder?.DEFAULT ?? 0,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio?.IOSAudioQuality?.HIGH ?? 0,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 256000,
  },
};

export class WhisperSpeechService implements SpeechService {
  readonly engineName = 'whisper';

  private modelId: WhisperModelId;
  private modelManager: ModelManager;
  private language: string;
  private prompt: string;
  private state: SpeechState = 'idle';
  private callbacks: SpeechServiceCallbacks = {};

  private recording: any = null;
  private listenStartTime = 0;
  private activeTranscriptionStop: (() => Promise<void>) | null = null;

  // Static cached Whisper context across service instances while in foreground
  private static cachedContext: any = null;
  private static cachedModelPath: string | null = null;
  private static appStateSubscribed = false;

  constructor(options: WhisperServiceOptions = {}) {
    this.modelId = options.modelId || 'base';
    this.modelManager = options.modelManager || defaultModelManager;
    this.language = options.language || 'en';
    this.prompt = options.prompt || buildWhisperPrompt({
      categories: options.categories,
      learnedKeywords: options.learnedKeywords,
    });

    WhisperSpeechService.setupAppStateListener();
  }

  private static setupAppStateListener(): void {
    if (WhisperSpeechService.appStateSubscribed) return;
    WhisperSpeechService.appStateSubscribed = true;

    try {
      AppState.addEventListener('change', (nextAppState: any) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          WhisperSpeechService.releaseModel();
        }
      });
    } catch {
      // In test runner or non-app environment
    }
  }

  /**
   * Releases any loaded whisper model from memory.
   */
  static async releaseModel(): Promise<void> {
    if (WhisperSpeechService.cachedContext) {
      try {
        await WhisperSpeechService.cachedContext.release();
      } catch {
        // Ignore release error
      }
      WhisperSpeechService.cachedContext = null;
      WhisperSpeechService.cachedModelPath = null;
    }
  }

  getState(): SpeechState {
    return this.state;
  }

  private setState(newState: SpeechState): void {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  /**
   * Checks if Whisper engine is available (model downloaded and native module loaded).
   */
  async isAvailable(): Promise<boolean> {
    try {
      const isDownloaded = await this.modelManager.isModelDownloaded(this.modelId);
      return isDownloaded;
    } catch {
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Ensures the whisper model is loaded into memory (lazily, foreground only).
   */
  private async getOrInitContext(): Promise<any> {
    const modelPath = this.modelManager.getModelPath(this.modelId);

    if (
      WhisperSpeechService.cachedContext &&
      WhisperSpeechService.cachedModelPath === modelPath
    ) {
      return WhisperSpeechService.cachedContext;
    }

    // Release prior if switching models
    await WhisperSpeechService.releaseModel();

    if (!initWhisperFn) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const whisperModule = require('whisper.rn');
      initWhisperFn = whisperModule.initWhisper;
    }

    if (typeof initWhisperFn !== 'function') {
      throw new Error('whisper.rn native library is not available on this device');
    }

    const context = await initWhisperFn({
      filePath: modelPath,
    });

    WhisperSpeechService.cachedContext = context;
    WhisperSpeechService.cachedModelPath = modelPath;
    return context;
  }

  /**
   * Starts microphone recording in push-to-talk style.
   */
  async startListening(callbacks: SpeechServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.listenStartTime = Date.now();

    // 1. Check permissions
    const permitted = await this.requestPermissions();
    if (!permitted) {
      this.setState('error');
      this.callbacks.onError?.(
        'Microphone permission is required for voice recognition.',
        'PERMISSION_DENIED'
      );
      return;
    }

    // 2. Check if model is downloaded
    const isDownloaded = await this.modelManager.isModelDownloaded(this.modelId);
    if (!isDownloaded) {
      this.setState('error');
      const model = this.modelManager.getModelInfo(this.modelId);
      this.callbacks.onError?.(
        `Whisper model (${model.name}) is not downloaded. Please download it in Settings or switch to Phone Recognizer.`,
        'MODEL_MISSING'
      );
      return;
    }

    try {
      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Abort any existing recording
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch {
          // Ignore
        }
        this.recording = null;
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(WHISPER_RECORDING_OPTIONS);
      await newRecording.startAsync();

      this.recording = newRecording;
      this.setState('listening');
    } catch (err: any) {
      this.setState('error');
      this.callbacks.onError?.(
        `Failed to start microphone: ${err.message || 'Unknown error'}`,
        'RECORDING_START_FAILED'
      );
    }
  }

  /**
   * Stops recording and initiates Whisper offline transcription.
   */
  async stopListening(): Promise<void> {
    if (!this.recording) {
      this.setState('idle');
      return;
    }

    const rec = this.recording;
    this.recording = null;

    try {
      // Transition state to processing ("Understanding...")
      this.setState('processing');

      await rec.stopAndUnloadAsync();
      const audioUri = rec.getURI();

      if (!audioUri) {
        this.setState('idle');
        this.callbacks.onError?.('No audio recorded. Please try speaking again.', 'NO_AUDIO');
        return;
      }

      // Load Whisper context
      const context = await this.getOrInitContext();

      // Transcribe with 20 second timeout
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          if (this.activeTranscriptionStop) {
            this.activeTranscriptionStop().catch(() => {});
          }
          reject(
            new Error(
              'Voice understanding timed out after 20 seconds. Please try speaking a shorter phrase.'
            )
          );
        }, 20000);
      });

      const transcribeTask = context.transcribe(audioUri, {
        language: this.language,
        prompt: this.prompt,
        maxThreads: 4,
        temperature: 0.0,
      });

      this.activeTranscriptionStop = transcribeTask.stop;

      const transcribePromise = transcribeTask.promise.finally(() => {
        clearTimeout(timeoutHandle);
        this.activeTranscriptionStop = null;
      });

      const result = await Promise.race([transcribePromise, timeoutPromise]);
      const rawText = (result.result || '').trim();
      const latencyMs = Date.now() - this.listenStartTime;

      this.setState('idle');

      if (!rawText) {
        this.callbacks.onError?.("Couldn't hear anything clearly. Please try again.", 'NO_SPEECH');
      } else {
        this.callbacks.onFinalTranscript?.(rawText, {
          engine: 'whisper',
          latencyMs,
          confidence: 0.95,
          alternatives: [rawText],
        });
      }
    } catch (err: any) {
      this.setState('error');
      this.callbacks.onError?.(
        err.message || 'Whisper transcription failed. Please try again.',
        'WHISPER_ERROR'
      );
    }
  }

  /**
   * Aborts listening or in-flight transcription immediately.
   */
  async abort(): Promise<void> {
    if (this.activeTranscriptionStop) {
      try {
        await this.activeTranscriptionStop();
      } catch {
        // Ignore
      }
      this.activeTranscriptionStop = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore
      }
      this.recording = null;
    }

    this.setState('idle');
  }
}
