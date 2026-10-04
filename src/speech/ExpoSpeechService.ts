/**
 * Production implementation of `SpeechService` using `expo-speech-recognition`.
 * Where it fits: Bridges React Native UI components directly to Android's native
 * speech recognition system.
 *
 * WHY does on-device speech fall back to online?
 * Beginner note: Privacy vs Reliability! On-device speech recognition is ideal because
 * audio never leaves your phone and works without internet. However, Android only supports
 * offline speech if the user has previously downloaded the offline "English (India)" pack.
 * If that pack is missing, falling back to online speech ensures the user's voice command
 * still succeeds instead of throwing an unhelpful error.
 */

import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { SpeechService, SpeechServiceCallbacks, SpeechState } from './SpeechService';

export class ExpoSpeechService implements SpeechService {
  private state: SpeechState = 'idle';
  private callbacks: SpeechServiceCallbacks = {};
  private subscriptions: { remove: () => void }[] = [];
  private fallbackToOnline = false;

  getState(): SpeechState {
    return this.state;
  }

  private setState(newState: SpeechState) {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!ExpoSpeechRecognitionModule?.isRecognitionAvailable) {
        return false;
      }
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      const res = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  }

  async startListening(callbacks: SpeechServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;

    // Check permissions first
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        this.setState('error');
        this.callbacks.onError?.(
          "Microphone permission was not granted. Please enable it in Settings, or use the 'Type instead' option.",
          'not-allowed'
        );
        return;
      }
    }

    this.cleanupSubscriptions();

    // Attach native event listeners
    const startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
      this.setState('listening');
    });

    const resultSub = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results?.[0]?.transcript ?? '';
        if (!transcript) return;

        if (event.isFinal) {
          this.setState('processing');
          this.callbacks.onFinalTranscript?.(transcript);
        } else {
          this.callbacks.onPartialTranscript?.(transcript);
        }
      }
    );

    const errorSub = ExpoSpeechRecognitionModule.addListener(
      'error',
      async (event: ExpoSpeechRecognitionErrorEvent) => {
        // If on-device recognition failed because offline pack is missing, retry with online recognition
        if (
          !this.fallbackToOnline &&
          (event.error === 'language-not-supported' ||
            event.error === 'service-not-allowed' ||
            event.error === 'client')
        ) {
          this.fallbackToOnline = true;
          this.cleanupSubscriptions();
          try {
            await this.startListening(callbacks);
            return;
          } catch {
            // Proceed to standard error handling
          }
        }

        this.setState('error');
        const friendlyMessage = this.getFriendlyErrorMessage(event.error);
        this.callbacks.onError?.(friendlyMessage, event.error);
      }
    );

    const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
      if (this.state === 'listening') {
        this.setState('idle');
      }
    });

    this.subscriptions = [startSub, resultSub, errorSub, endSub];

    // Check on-device availability
    const supportsOnDevice =
      !this.fallbackToOnline &&
      typeof ExpoSpeechRecognitionModule.supportsOnDeviceRecognition === 'function' &&
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

    try {
      this.setState('listening');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-IN',
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: supportsOnDevice,
        addsPunctuation: true,
      });
    } catch (err: any) {
      this.setState('error');
      this.callbacks.onError?.(
        err?.message || 'Could not start speech recognition. Please type your expense instead.',
        'start-failed'
      );
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (this.state === 'listening') {
        this.setState('processing');
        ExpoSpeechRecognitionModule.stop();
      }
    } catch {
      this.setState('idle');
    }
  }

  async abort(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Ignored
    } finally {
      this.cleanupSubscriptions();
      this.setState('idle');
    }
  }

  private cleanupSubscriptions() {
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {
        // Ignored
      }
    }
    this.subscriptions = [];
  }

  private getFriendlyErrorMessage(error: string): string {
    switch (error) {
      case 'not-allowed':
        return "Microphone permission was denied. Please enable microphone access in your phone Settings, or use the 'Type instead' box.";
      case 'no-speech':
      case 'speech-timeout':
        return 'No speech was detected. Tap the mic and speak clearly, or type your expense.';
      case 'service-not-allowed':
        return 'Speech recognizer service is unavailable on your device. You can type your expense instead.';
      case 'network':
        return 'Network issue during speech recognition. Check your connection or type your expense instead.';
      case 'busy':
        return 'Speech recognizer is busy. Please try again in a moment.';
      default:
        return 'Could not recognize speech. Please try speaking again or use typing instead.';
    }
  }
}
