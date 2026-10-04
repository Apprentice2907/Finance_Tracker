export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export interface SpeechServiceCallbacks {
  onStateChange?: (state: SpeechState) => void;
  onPartialTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (friendlyMessage: string, errorCode: string) => void;
}

export interface SpeechService {
  isAvailable(): Promise<boolean>;
  hasPermissions(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  startListening(callbacks: SpeechServiceCallbacks): Promise<void>;
  stopListening(): Promise<void>;
  abort(): Promise<void>;
  getState(): SpeechState;
}
