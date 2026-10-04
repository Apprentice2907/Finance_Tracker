/**
 * Speech Recognition service interface and event callback definitions.
 * Where it fits: Defines the contract that voice components (`VoiceSheet`) use to talk
 * to speech recognizers without coupling to any specific hardware library.
 *
 * WHY is SpeechService an interface?
 * Beginner note: Testability! Real voice recognition requires a physical microphone,
 * Android permissions, and Google speech services. By defining an interface, our UI
 * components can be tested deterministically in Jest using `FakeSpeechService` without
 * needing a phone or emulator.
 */

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export interface TranscriptDetails {
  alternatives?: string[];
  latencyMs?: number;
  engine?: string;
  confidence?: number;
}

export interface SpeechServiceCallbacks {
  onStateChange?: (state: SpeechState) => void;
  onPartialTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string, details?: TranscriptDetails) => void;
  onError?: (friendlyMessage: string, errorCode: string) => void;
}

export interface SpeechService {
  readonly engineName?: string;
  isAvailable(): Promise<boolean>;
  hasPermissions(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  startListening(callbacks: SpeechServiceCallbacks): Promise<void>;
  stopListening(): Promise<void>;
  abort(): Promise<void>;
  getState(): SpeechState;
}
