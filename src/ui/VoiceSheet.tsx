/**
 * Voice input bottom sheet modal with audio ripple animation and "Type instead" mode.
 * Where it fits: Triggered by the floating mic button or keyboard button on the Home screen.
 *
 * Beginner note: What is a "Bottom Sheet"? It's a mobile design pattern where a modal
 * card slides up from the bottom of the screen, letting the user complete an action without
 * losing sight of where they were.
 *
 * Beginner note: What is a React Hook (`useState`, `useEffect`)? Hooks let functional
 * components remember data (`useState`) and synchronize with outside systems (`useEffect`),
 * such as starting the microphone when the modal opens and aborting it when closed.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from './tokens';
import { MicIcon } from './icons';
import { SpeechService, SpeechState } from '../speech/SpeechService';
import { ExpoSpeechService, createSpeechService, WhisperModelId } from '../speech';
import { useAppStore } from '../state/useAppStore';

interface VoiceSheetProps {
  visible: boolean;
  initialMode?: 'voice' | 'typed';
  onClose: () => void;
  onTranscriptReady: (
    transcript: string,
    source: 'voice' | 'typed',
    details?: { alternatives?: string[]; latencyMs?: number; engine?: string }
  ) => void;
  speechService?: SpeechService;
}

const VoiceSheetContent: React.FC<VoiceSheetProps> = ({
  visible,
  initialMode = 'voice',
  onClose,
  onTranscriptReady,
  speechService,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxSheetHeight = height - insets.top - 24;

  const { preferOnDevice, keywords, voiceEngine, whisperModel, categories, showBanner } = useAppStore();
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTypingMode, setIsTypingMode] = useState(initialMode === 'typed');
  const [typedText, setTypedText] = useState('');

  const learnedWords = useMemo(() => keywords.map((k) => k.word), [keywords]);
  const [activeService, setActiveService] = useState<SpeechService>(
    () => speechService || new ExpoSpeechService({ preferOnDevice, contextualStrings: learnedWords })
  );
  const effectiveService = speechService || activeService;

  useEffect(() => {
    if (speechService) {
      return;
    }

    let isCancelled = false;
    createSpeechService({
      engine: voiceEngine,
      whisperModelId: whisperModel as WhisperModelId,
      preferOnDevice,
      contextualStrings: learnedWords,
      categories: categories.map((c) => c.name),
      onFallback: (reason) => {
        showBanner(reason, 4000);
      },
    }).then(({ service }) => {
      if (!isCancelled) {
        setActiveService(service);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [speechService, voiceEngine, whisperModel, preferOnDevice, learnedWords, categories, showBanner]);

  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    let isCancelled = false;
    const startTime = Date.now();
    if (!isTypingMode) {
      effectiveService
        .startListening({
          onStateChange: (state) => {
            if (!isCancelled) setSpeechState(state);
          },
          onPartialTranscript: (text) => {
            if (!isCancelled) setPartialTranscript(text);
          },
          onFinalTranscript: (text, details) => {
            if (!isCancelled) {
              setSpeechState('idle');
              const latencyMs = details?.latencyMs ?? (Date.now() - startTime);
              onTranscriptReady(text, 'voice', {
                alternatives: details?.alternatives || [text],
                latencyMs,
                engine: details?.engine || effectiveService.engineName || 'expo',
              });
            }
          },
          onError: (friendlyMsg) => {
            if (!isCancelled) {
              setErrorMessage(friendlyMsg);
              setSpeechState('error');
            }
          },
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            setErrorMessage(err instanceof Error ? err.message : 'Speech recognition error');
            setSpeechState('error');
          }
        });
    }

    return () => {
      isCancelled = true;
      effectiveService.abort().catch(() => {});
    };
  }, [isTypingMode, effectiveService, onTranscriptReady]);

  // Pulse animation while listening
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (speechState === 'listening') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [speechState, pulseAnim]);

  const handleMicPress = () => {
    if (speechState === 'listening') {
      effectiveService.stopListening().catch(() => {});
    } else {
      setErrorMessage(null);
      setPartialTranscript('');
      const startTime = Date.now();
      effectiveService
        .startListening({
          onStateChange: (state) => setSpeechState(state),
          onPartialTranscript: (text) => setPartialTranscript(text),
          onFinalTranscript: (text, details) => {
            setSpeechState('idle');
            const latencyMs = details?.latencyMs ?? (Date.now() - startTime);
            onTranscriptReady(text, 'voice', {
              alternatives: details?.alternatives || [text],
              latencyMs,
              engine: details?.engine || effectiveService.engineName || 'expo',
            });
          },
          onError: (friendlyMsg) => {
            setErrorMessage(friendlyMsg);
            setSpeechState('error');
          },
        })
        .catch((err: unknown) => {
          setErrorMessage(err instanceof Error ? err.message : 'Speech recognition error');
          setSpeechState('error');
        });
    }
  };

  const handleTypedSubmit = () => {
    const text = typedText.trim();
    if (!text) return;
    setTypedText('');
    setIsTypingMode(false);
    onTranscriptReady(text, 'typed');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { maxHeight: maxSheetHeight, paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isTypingMode ? 'Type your expense' : 'Speak to Wini'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          {!isTypingMode ? (
            <View style={styles.voiceContainer}>
              <Text style={styles.hintText}>
                {speechState === 'listening'
                  ? 'Listening... say "add 10 rupees rickshaw"'
                  : speechState === 'processing'
                  ? 'Understanding...'
                  : 'Tap the mic to start speaking'}
              </Text>

              {/* Animated Mic Button */}
              <View style={styles.micWrapper}>
                <Animated.View
                  style={[
                    styles.pulseCircle,
                    speechState === 'listening' && {
                      transform: [{ scale: pulseAnim }],
                      opacity: 0.6,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    speechState === 'listening' && styles.micButtonListening,
                  ]}
                  onPress={handleMicPress}
                  activeOpacity={0.8}
                >
                  <MicIcon size={36} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Live Partial Transcript */}
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>
                  {partialTranscript
                    ? `"${partialTranscript}"`
                    : speechState === 'listening'
                    ? 'Speak naturally in English or Hinglish...'
                    : speechState === 'processing'
                    ? 'Understanding...'
                    : ''}
                </Text>
              </View>

              {/* Error banner if any */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Switch to typing */}
              <TouchableOpacity
                style={styles.typeInsteadBtn}
                onPress={() => {
                  activeService.abort().catch(() => {});
                  setIsTypingMode(true);
                }}
              >
                <Text style={styles.typeInsteadText}>Type instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.typeContainer}>
              <Text style={styles.typeHint}>
                {'Type naturally, e.g. "kal 100 petrol" or "add 250 lunch"'}
              </Text>

              <TextInput
                style={styles.typeInput}
                placeholder="Type here..."
                placeholderTextColor={colors.muted}
                value={typedText}
                onChangeText={setTypedText}
                autoFocus
                onSubmitEditing={handleTypedSubmit}
                returnKeyType="done"
              />

              <View style={styles.typeActions}>
                <TouchableOpacity
                  style={styles.switchBackMic}
                  onPress={() => setIsTypingMode(false)}
                >
                  <Text style={styles.switchBackMicText}>Use Voice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitTypeBtn,
                    !typedText.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleTypedSubmit}
                  disabled={!typedText.trim()}
                >
                  <Text style={styles.submitTypeText}>Process</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const VoiceSheet: React.FC<VoiceSheetProps> = (props) => {
  if (!props.visible) return null;
  return <VoiceSheetContent {...props} />;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    minHeight: 340,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
    alignSelf: 'center',
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: colors.muted,
    fontSize: 18,
    padding: spacing.xs,
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  micWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryMuted,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  micButtonListening: {
    backgroundColor: colors.expense,
    shadowColor: colors.expense,
  },
  transcriptBox: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  transcriptText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 122, 0.15)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxWidth: '90%',
  },
  errorText: {
    color: colors.expense,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  typeInsteadBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeInsteadText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  typeContainer: {
    paddingVertical: spacing.md,
  },
  typeHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  typeInput: {
    backgroundColor: colors.elevated,
    color: colors.text,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  typeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchBackMic: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBackMicText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitTypeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTypeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
