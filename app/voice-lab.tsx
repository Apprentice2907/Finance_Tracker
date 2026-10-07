/**
 * Voice Lab: Developer & Power-user workbench for evaluating speech recognition accuracy.
 * Where it fits: Navigated to from Settings → Voice Lab (/voice-lab).
 *
 * Beginner note: What is Voice Lab? When building voice-controlled software, speech-to-text
 * quality varies based on accents, background noise, and recognition engines. The Voice Lab
 * allows side-by-side benchmarking of transcription latency, confidence, parsed transaction
 * parameters, and saving ground-truth evaluation pairs to the local `voice_log` database.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { parseUtterance, ParseResult } from '../src/parser';
import { SpeechService, SpeechState } from '../src/speech/SpeechService';
import { createSpeechService, defaultModelManager, WhisperModelId } from '../src/speech';
import { VoiceLogEntry, VoiceLogTimings } from '../src/domain/types';
import { median, percentile } from '../src/domain/stats';
import { formatRupees } from '../src/domain/money';
import { MicIcon, TrashIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { Screen } from '../src/ui/kit';

function VoiceLabContent() {
  const router = useRouter();
  const {
    keywordMap,
    addVoiceLog,
    getVoiceLogs,
    clearVoiceLogs,
    voiceEngine,
    whisperModel,
    preferOnDevice,
    categories,
    showBanner,
  } = useAppStore();

  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [expectedText, setExpectedText] = useState('');
  const [logs, setLogs] = useState<VoiceLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [selectedLabEngine, setSelectedLabEngine] = useState<'expo' | 'whisper'>(
    voiceEngine === 'whisper' ? 'whisper' : 'expo'
  );
  const [activeEngineUsed, setActiveEngineUsed] = useState<string>('expo');
  const [isWhisperModelReady, setIsWhisperModelReady] = useState(false);
  const activeServiceRef = React.useRef<SpeechService | null>(null);
  const activeTimingsRef = React.useRef<VoiceLogTimings | null>(null);

  const latencyMetrics = useMemo(() => {
    const tapToListeningList: number[] = [];
    const endSpeechToSavedList: number[] = [];

    for (const log of logs.slice(0, 50)) {
      if (log.timings_json) {
        try {
          const t: VoiceLogTimings = JSON.parse(log.timings_json);
          if (t.tap && t.recognizer_started && t.recognizer_started >= t.tap) {
            tapToListeningList.push(t.recognizer_started - t.tap);
          }
          const endSpeech = t.final_result || t.first_partial;
          const savedTime = t.saved || t.ui_updated;
          if (endSpeech && savedTime && savedTime >= endSpeech) {
            endSpeechToSavedList.push(savedTime - endSpeech);
          }
        } catch {
          // Ignore json parse error
        }
      } else if (log.latency_ms > 0) {
        endSpeechToSavedList.push(log.latency_ms);
      }
    }

    return {
      tapToListeningMedian: median(tapToListeningList),
      tapToListeningP95: percentile(tapToListeningList, 95),
      tapToListeningCount: tapToListeningList.length,
      endSpeechToSavedMedian: median(endSpeechToSavedList),
      endSpeechToSavedP95: percentile(endSpeechToSavedList, 95),
      endSpeechToSavedCount: endSpeechToSavedList.length,
    };
  }, [logs]);

  useEffect(() => {
    defaultModelManager
      .isModelDownloaded((whisperModel as WhisperModelId) || 'base')
      .then(setIsWhisperModelReady);
  }, [whisperModel]);

  const loadLogs = useCallback(async () => {
    try {
      setIsLoadingLogs(true);
      const fetched = await getVoiceLogs(50);
      setLogs(fetched);
    } catch (err) {
      console.error('Failed to load voice logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [getVoiceLogs]);

  useEffect(() => {
    let isMounted = true;
    getVoiceLogs(50)
      .then((fetched) => {
        if (isMounted) setLogs(fetched);
      })
      .catch((err) => {
        console.error('Failed to load voice logs:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [getVoiceLogs]);

  const handleStartRecording = async () => {
    if (speechState === 'listening' || speechState === 'processing') {
      if (activeServiceRef.current) {
        await activeServiceRef.current.stopListening();
      }
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setCurrentTranscript('');
      setLatencyMs(null);
      setAlternatives([]);
      setParsed(null);
      setExpectedText('');
      setLastSavedId(null);

      const { service, selectedEngine } = await createSpeechService({
        engine: selectedLabEngine,
        whisperModelId: (whisperModel as WhisperModelId) || 'base',
        preferOnDevice,
        contextualStrings: Object.keys(keywordMap),
        categories: categories.map((c) => c.name),
        onFallback: (reason) => showBanner(reason, 4000),
      });

      activeServiceRef.current = service;
      setActiveEngineUsed(selectedEngine);

      const startTime = Date.now();
      const timings: VoiceLogTimings = {
        tap: startTime,
      };
      activeTimingsRef.current = timings;

      await service.startListening({
        onStateChange: (state) => {
          if (state === 'listening' && !timings.recognizer_started) {
            timings.recognizer_started = Date.now();
          }
          setSpeechState(state);
        },
        onPartialTranscript: (text) => {
          if (!timings.first_partial) {
            timings.first_partial = Date.now();
          }
          setCurrentTranscript(text);
        },
        onFinalTranscript: (text, details) => {
          timings.final_result = Date.now();
          const latency = details?.latencyMs ?? (Date.now() - startTime);
          setLatencyMs(latency);
          setCurrentTranscript(text);
          setExpectedText(text); // Default expected to heard text
          const alts = details?.alternatives || [text];
          setAlternatives(alts);

          const result = parseUtterance(text, new Date(), 'Asia/Kolkata', keywordMap);
          setParsed(result);
          setSpeechState('idle');

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        },
        onError: (friendlyMsg) => {
          setSpeechState('error');
          showBanner(friendlyMsg);
        },
      });
    } catch (err: any) {
      setSpeechState('error');
      showBanner(err?.message || 'Failed to start voice recognition');
    }
  };

  const handleSaveToLog = async () => {
    if (!currentTranscript.trim()) return;

    try {
      Haptics.selectionAsync().catch(() => {});
      const isCorrected = expectedText.trim().toLowerCase() !== currentTranscript.trim().toLowerCase();

      const parseToStore = parsed || parseUtterance(currentTranscript, new Date(), 'Asia/Kolkata', keywordMap);

      const nowSaved = Date.now();
      const updatedTimings: VoiceLogTimings = {
        ...(activeTimingsRef.current || {}),
        saved: nowSaved,
        ui_updated: nowSaved,
      };

      const entry = await addVoiceLog({
        engine: activeEngineUsed || selectedLabEngine,
        raw_transcript: currentTranscript.trim(),
        alternatives_json: JSON.stringify(alternatives.length ? alternatives : [currentTranscript.trim()]),
        parsed_json: JSON.stringify(parseToStore),
        final_saved_json: JSON.stringify({
          expectedText: expectedText.trim(),
          amountPaise: parseToStore.amountPaise,
          category: parseToStore.category,
        }),
        corrected: isCorrected,
        latency_ms: latencyMs || 0,
        timings_json: JSON.stringify(updatedTimings),
      });

      if (entry) {
        setLastSavedId(entry.id);
        showBanner(isCorrected ? 'Saved log with correction.' : 'Saved voice log entry.');
      } else {
        showBanner('Voice logging is currently disabled in Settings.');
      }
      await loadLogs();
    } catch (err: any) {
      showBanner(err?.message || 'Failed to save voice log');
    }
  };

  const handleCopyLogsAsJson = async () => {
    try {
      Haptics.selectionAsync().catch(() => {});
      const allLogs = await getVoiceLogs(200);
      const json = JSON.stringify(allLogs, null, 2);
      await Clipboard.setStringAsync(json);
      showBanner(`Copied ${allLogs.length} voice log records as JSON to clipboard.`);
    } catch (err: any) {
      showBanner(err?.message || 'Failed to copy voice log');
    }
  };

  const handleClearLogs = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      await clearVoiceLogs();
      setLogs([]);
      showBanner('Voice log cleared.');
    } catch (err: any) {
      showBanner(err?.message || 'Failed to clear voice log');
    }
  };

  return (
    <Screen scrollable={true} hasTabBar={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Navigation Header */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Back to Settings"
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Voice Lab</Text>
          <Text style={styles.subtitle}>
            Benchmark recognition accuracy, test alternative transcripts & inspect latency.
          </Text>
        </View>

        {/* Engine Selector */}
        <View style={styles.engineSelectCard}>
          <View style={styles.engineHeaderRow}>
            <Text style={styles.engineSelectTitle}>TEST ENGINE</Text>
            {selectedLabEngine === 'whisper' && !isWhisperModelReady && (
              <Text style={styles.engineWarningText}>Model missing (will fallback)</Text>
            )}
          </View>
          <View style={styles.engineButtonsRow}>
            <TouchableOpacity
              style={[
                styles.engineChoiceBtn,
                selectedLabEngine === 'expo' && styles.engineChoiceBtnActive,
              ]}
              onPress={() => setSelectedLabEngine('expo')}
            >
              <Text
                style={[
                  styles.engineChoiceText,
                  selectedLabEngine === 'expo' && styles.engineChoiceTextActive,
                ]}
              >
                Phone Recognizer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineChoiceBtn,
                selectedLabEngine === 'whisper' && styles.engineChoiceBtnActive,
              ]}
              onPress={() => setSelectedLabEngine('whisper')}
            >
              <Text
                style={[
                  styles.engineChoiceText,
                  selectedLabEngine === 'whisper' && styles.engineChoiceTextActive,
                ]}
              >
                Whisper (Local)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Latency Benchmarks (Last 50 attempts) */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeaderRow}>
            <Text style={styles.metricsHeaderTitle}>LATENCY BENCHMARKS (LAST 50)</Text>
            <Text style={styles.metricsHeaderSub}>Targets: ≤250ms / ≤500ms</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Tap-to-Listening</Text>
              <Text style={styles.metricValue}>
                {latencyMetrics.tapToListeningCount > 0
                  ? `${Math.round(latencyMetrics.tapToListeningMedian)}ms`
                  : '—'}
              </Text>
              <Text style={styles.metricSub}>
                p95: {latencyMetrics.tapToListeningCount > 0 ? `${Math.round(latencyMetrics.tapToListeningP95)}ms` : '—'}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>End-of-Speech-to-Saved</Text>
              <Text style={styles.metricValue}>
                {latencyMetrics.endSpeechToSavedCount > 0
                  ? `${Math.round(latencyMetrics.endSpeechToSavedMedian)}ms`
                  : '—'}
              </Text>
              <Text style={styles.metricSub}>
                p95: {latencyMetrics.endSpeechToSavedCount > 0 ? `${Math.round(latencyMetrics.endSpeechToSavedP95)}ms` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Interactive Recording Panel */}
        <View style={styles.testCard}>
          <Text style={styles.cardTitle}>Live Phrase Evaluation</Text>
          <Text style={styles.cardDesc}>
            Tap the button, speak a natural expense (e.g. &ldquo;chai 20 rupees&rdquo;, &ldquo;kal 50 auto&rdquo;), and inspect how the recognizer and parser handle it.
          </Text>

          <View style={styles.micCenter}>
            <TouchableOpacity
              style={[
                styles.micButton,
                speechState === 'listening' && styles.micButtonListening,
              ]}
              onPress={handleStartRecording}
              activeOpacity={0.8}
            >
              <MicIcon size={28} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.micStateText}>
              {speechState === 'listening'
                ? 'Listening... tap to stop'
                : speechState === 'processing'
                ? 'Processing utterance...'
                : 'Tap to speak phrase'}
            </Text>
          </View>

          {/* Transcript & Latency Display */}
          {currentTranscript ? (
            <View style={styles.resultBox}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Heard Transcript:</Text>
                <Text style={styles.resultValue}>{`"${currentTranscript}"`}</Text>
              </View>

              {latencyMs !== null && (
                <View style={styles.statPillsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillLabel}>Latency:</Text>
                    <Text style={styles.statPillVal}>{latencyMs} ms</Text>
                  </View>
                  {parsed && (
                    <View style={styles.statPill}>
                      <Text style={styles.statPillLabel}>Parser Confidence:</Text>
                      <Text style={styles.statPillVal}>{Math.round(parsed.confidence * 100)}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Parsed Output Details */}
              {parsed && (
                <View style={styles.parsedCard}>
                  <Text style={styles.parsedTitle}>Parser Breakdown</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Amount:</Text>
                    <Text style={styles.breakdownVal}>
                      {parsed.amountPaise ? formatRupees(parsed.amountPaise) : 'Not detected'}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Category:</Text>
                    <Text style={styles.breakdownVal}>{parsed.category || 'General / Unknown'}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Note:</Text>
                    <Text style={styles.breakdownVal}>{parsed.note || 'None'}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Date:</Text>
                    <Text style={styles.breakdownVal}>{parsed.date}</Text>
                  </View>
                </View>
              )}

              {/* Alternatives List */}
              {alternatives.length > 1 && (
                <View style={styles.altsBox}>
                  <Text style={styles.altsLabel}>Top Alternatives from Recognizer:</Text>
                  {alternatives.map((alt, i) => (
                    <Text key={i} style={styles.altText}>
                      {i + 1}. &ldquo;{alt}&rdquo;
                    </Text>
                  ))}
                </View>
              )}

              {/* Ground Truth / Expected Text Field */}
              <View style={styles.expectedField}>
                <Text style={styles.expectedLabel}>Expected Text (Ground Truth):</Text>
                <TextInput
                  style={styles.expectedInput}
                  value={expectedText}
                  onChangeText={setExpectedText}
                  placeholder="Type what you intended to say..."
                  placeholderTextColor={colors.muted}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveLogBtn, lastSavedId && styles.saveLogBtnSaved]}
                onPress={handleSaveToLog}
                activeOpacity={0.8}
              >
                <Text style={styles.saveLogBtnText}>
                  {lastSavedId ? '✓ Saved to Voice Log' : 'Save Evaluation to Voice Log'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Section: Voice Log History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleWrap}>
              <Text style={styles.historyTitle}>Voice Log Records</Text>
              <Text style={styles.logCountBadge}>{logs.length}</Text>
            </View>
            <View style={styles.historyActions}>
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={handleCopyLogsAsJson}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnSmallText}>Copy JSON</Text>
              </TouchableOpacity>
              {logs.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                  onPress={handleClearLogs}
                  activeOpacity={0.8}
                >
                  <TrashIcon size={14} color={colors.expense} />
                  <Text style={[styles.actionBtnSmallText, { color: colors.expense }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoadingLogs ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No voice log entries recorded yet. Test a phrase above or record voice transactions on Home!
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {logs.map((entry, idx) => {
                let parsedSummary = '';
                try {
                  const p = JSON.parse(entry.parsed_json);
                  if (p.amountPaise) parsedSummary = `${formatRupees(p.amountPaise)} • ${p.category || 'General'}`;
                } catch {
                  parsedSummary = '';
                }

                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.logRow,
                      idx === logs.length - 1 && styles.rowLast,
                    ]}
                  >
                    <View style={styles.logLeft}>
                      <View style={styles.logMetaRow}>
                        <Text style={styles.logEngine}>{entry.engine}</Text>
                        <Text style={styles.logLatency}>{entry.latency_ms}ms</Text>
                        {Boolean(entry.corrected) && (
                          <View style={styles.correctedBadge}>
                            <Text style={styles.correctedBadgeText}>Corrected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.logTranscript}>&ldquo;{entry.raw_transcript}&rdquo;</Text>
                      {parsedSummary ? (
                        <Text style={styles.logParsedSummary}>{parsedSummary}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

export default function VoiceLabScreen() {
  return (
    <ErrorBoundary fallbackTitle="Voice Lab unavailable">
      <VoiceLabContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  topNav: {
    marginBottom: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backArrow: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  engineSelectCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  engineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  engineSelectTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  engineWarningText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  engineButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  engineChoiceBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  engineChoiceBtnActive: {
    backgroundColor: `${colors.primary}22`,
    borderColor: colors.primary,
  },
  engineChoiceText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  engineChoiceTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  testCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  micCenter: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonListening: {
    backgroundColor: colors.expense,
    transform: [{ scale: 1.08 }],
  },
  micStateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  resultBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    marginBottom: spacing.sm,
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 4,
  },
  statPillLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  statPillVal: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  parsedCard: {
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  parsedTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  breakdownVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  altsBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: `${colors.border}44`,
    borderRadius: radii.sm,
  },
  altsLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  altText: {
    color: colors.text,
    fontSize: 12,
    marginVertical: 1,
  },
  expectedField: {
    marginTop: spacing.md,
  },
  expectedLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  expectedInput: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  saveLogBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveLogBtnSaved: {
    backgroundColor: colors.income,
  },
  saveLogBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: spacing.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  logCountBadge: {
    color: colors.primary,
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.round,
    fontSize: 12,
    fontWeight: '700',
  },
  historyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnDanger: {
    borderColor: `${colors.expense}66`,
  },
  actionBtnSmallText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  logLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  logEngine: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logLatency: {
    color: colors.muted,
    fontSize: 11,
  },
  correctedBadge: {
    backgroundColor: `${colors.warning}22`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  correctedBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  logTranscript: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  logParsedSummary: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  logTime: {
    color: colors.muted,
    fontSize: 11,
  },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  metricsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricsHeaderTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricsHeaderSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
    marginBottom: 2,
  },
  metricSub: {
    color: colors.muted,
    fontSize: 11,
  },
  metricDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
