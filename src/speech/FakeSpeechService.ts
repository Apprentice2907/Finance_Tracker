/**
 * Mock SpeechService test double for automated tests and simulations.
 * Where it fits: Used in Jest unit and integration tests (`confirmFlow.test.ts`)
 * instead of the native `ExpoSpeechService`.
 *
 * Beginner note: What is a "Mock" or "Test Double"? In testing, you don't want tests
 * waiting for a real human to speak into a microphone. `FakeSpeechService` implements
 * the same `SpeechService` interface, allowing tests to trigger `emitFinalTranscript("chai 20")`
 * instantly and verify the app's response with 100% precision.
 */

import { SpeechService, SpeechServiceCallbacks, SpeechState } from './SpeechService';

export class FakeSpeechService implements SpeechService {
  public readonly engineName = 'fake';
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

  emitFinalTranscript(text: string, details?: any) {
    this.state = 'processing';
    this.callbacks.onStateChange?.('processing');
    this.callbacks.onFinalTranscript?.(text, details);
    this.state = 'idle';
    this.callbacks.onStateChange?.('idle');
  }

  emitError(message: string, code: string) {
    this.state = 'error';
    this.callbacks.onStateChange?.('error');
    this.callbacks.onError?.(message, code);
  }
}
