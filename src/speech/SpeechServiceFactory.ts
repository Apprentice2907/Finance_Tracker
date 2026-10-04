/**
 * Speech Service Factory for Wini.
 * Where it fits: Decides which voice recognition engine to instantiate (Whisper vs Expo),
 * checks model availability, and gracefully falls back to the phone recognizer if Whisper
 * is missing or fails to initialize.
 *
 * Beginner note: Fallbacks ensure the app never crashes or dead-ends for the user. If an
 * advanced AI feature (like offline Whisper) is missing its downloaded model file, Wini
 * smoothly falls back to the built-in Android/iOS voice recognizer and explains why in plain language!
 */

import { SpeechService } from './SpeechService';
import { ExpoSpeechService } from './ExpoSpeechService';
import { WhisperSpeechService } from './WhisperSpeechService';
import { defaultModelManager, ModelManager, WhisperModelId } from './ModelManager';

export interface SpeechFactoryOptions {
  engine?: string; // 'expo' | 'whisper'
  whisperModelId?: WhisperModelId;
  preferOnDevice?: boolean;
  contextualStrings?: string[];
  categories?: string[];
  modelManager?: ModelManager;
  onFallback?: (reason: string) => void;
}

export interface SpeechServiceCreationResult {
  service: SpeechService;
  selectedEngine: 'expo' | 'whisper';
  fallbackReason?: string;
}

/**
 * Creates the appropriate SpeechService based on user settings and device state.
 * If Whisper is requested but its model is missing or fails to initialize,
 * it automatically falls back to ExpoSpeechService and returns the explanation.
 */
export async function createSpeechService(
  options: SpeechFactoryOptions = {}
): Promise<SpeechServiceCreationResult> {
  const engine = options.engine === 'whisper' ? 'whisper' : 'expo';

  if (engine === 'whisper') {
    const modelManager = options.modelManager || defaultModelManager;
    const modelId = options.whisperModelId || 'base';

    let isDownloaded = false;
    try {
      isDownloaded = await modelManager.isModelDownloaded(modelId);
    } catch {
      isDownloaded = false;
    }

    if (!isDownloaded) {
      const modelInfo = modelManager.getModelInfo(modelId);
      const fallbackReason = `Whisper model "${modelInfo.name}" is not downloaded yet. Falling back to phone recognizer.`;
      options.onFallback?.(fallbackReason);

      return {
        service: new ExpoSpeechService({
          preferOnDevice: options.preferOnDevice,
          contextualStrings: options.contextualStrings,
        }),
        selectedEngine: 'expo',
        fallbackReason,
      };
    }

    try {
      const whisperService = new WhisperSpeechService({
        modelId,
        modelManager,
        categories: options.categories,
        learnedKeywords: options.contextualStrings,
      });

      return {
        service: whisperService,
        selectedEngine: 'whisper',
      };
    } catch (err: any) {
      const fallbackReason = `Whisper initialization failed (${err.message || 'unknown error'}). Falling back to phone recognizer.`;
      options.onFallback?.(fallbackReason);

      return {
        service: new ExpoSpeechService({
          preferOnDevice: options.preferOnDevice,
          contextualStrings: options.contextualStrings,
        }),
        selectedEngine: 'expo',
        fallbackReason,
      };
    }
  }

  // Default: Phone Recognizer
  return {
    service: new ExpoSpeechService({
      preferOnDevice: options.preferOnDevice,
      contextualStrings: options.contextualStrings,
    }),
    selectedEngine: 'expo',
  };
}
