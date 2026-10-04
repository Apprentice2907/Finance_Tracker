import { SpeechService, SpeechServiceCallbacks, SpeechState } from './SpeechService';

export class FakeSpeechService implements SpeechService {
  private state: SpeechState = 'idle';
  private callbacks: SpeechServiceCallbacks = {};
  public permissionGranted = true;
  public available = true;

  getState(): SpeechState {
    return this.state;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async hasPermissions(): Promise<boolean> {
    return this.permissionGranted;
  }

  async requestPermissions(): Promise<boolean> {
    return this.permissionGranted;
  }

  async startListening(callbacks: SpeechServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;
    if (!this.permissionGranted) {
      this.state = 'error';
      callbacks.onStateChange?.('error');
      callbacks.onError?.(
        "Microphone permission was denied. Please enable it in Settings, or use the 'Type instead' box.",
        'not-allowed'
      );
      return;
    }
    if (!this.available) {
      this.state = 'error';
      callbacks.onStateChange?.('error');
      callbacks.onError?.(
        'Speech recognizer is currently unavailable on this device.',
        'service-not-allowed'
      );
      return;
    }

    this.state = 'listening';
    callbacks.onStateChange?.('listening');
  }

  async stopListening(): Promise<void> {
    if (this.state === 'listening') {
      this.state = 'processing';
      this.callbacks.onStateChange?.('processing');
    }
  }

  async abort(): Promise<void> {
    this.state = 'idle';
    this.callbacks.onStateChange?.('idle');
  }

  // --- Test helpers to simulate speech events ---

  emitPartialTranscript(text: string) {
    if (this.state === 'listening') {
      this.callbacks.onPartialTranscript?.(text);
    }
  }

  emitFinalTranscript(text: string) {
    this.state = 'processing';
    this.callbacks.onStateChange?.('processing');
    this.callbacks.onFinalTranscript?.(text);
    this.state = 'idle';
    this.callbacks.onStateChange?.('idle');
  }

  emitError(message: string, code: string) {
    this.state = 'error';
    this.callbacks.onStateChange?.('error');
    this.callbacks.onError?.(message, code);
  }
}
