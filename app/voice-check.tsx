/**
 * Voice Check benchmark runner screen for Wini.
 * Where it fits: Accessible from Settings -> Voice Check (/voice-check).
 *
 * Implements WINI_V2_FEATURES.md Section 4.4 and Appendix:
 * - Tests the 50 standard phrases one by one against speech recognition and parser.
 * - Displays heard text, parsed result vs expected, pass/fail status, and latency.
 * - Summary shows overall pass rate, average latency, worst words per engine.
 * - Exports results as JSON and CSV via native sharing / clipboard.
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useTheme } from '../src/ui/ThemeContext';
import { useAppStore } from '../src/state/useAppStore';
import { VOICE_CHECK_PHRASES, VoiceCheckPhrase } from '../src/voice/voiceCheckPhrases';
import { parseUtterance, ParseResult } from '../src/parser';
import { createSpeechService, SpeechService, SpeechState, WhisperModelId } from '../src/speech';
import { getRelativeDateIndia, getTodayIndia } from '../src/domain/dates';
import { formatRupees } from '../src/domain/money';
import { Screen, Card, GlassChip, CategoryIcon } from '../src/ui/kit';
import { MicIcon, ExportIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';

interface CheckAttemptResult {
  phraseId: number;
  phrase: string;
  heardText: string;
  parsed: ParseResult;
  expectedCategory: string;
  expectedAmountPaise: number;
  expectedType: string;
  expectedDate: string;
  expectedAccountAlias?: string;
  isPass: boolean;
  mismatches: string[];
  latencyMs: number;
  engine: string;
}

function VoiceCheckContent() {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const {
    keywordMap,
    voiceEngine,
    whisperModel,
    preferOnDevice,
    categories,
    showBanner,
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedEngine, setSelectedEngine] = useState<'expo' | 'whisper'>(
    voiceEngine === 'whisper' ? 'whisper' : 'expo'
  );
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [heardTranscript, setHeardTranscript] = useState('');
  const [results, setResults] = useState<Record<number, CheckAttemptResult>>({});
  const [isExporting, setIsExporting] = useState(false);

  const activeServiceRef = useRef<SpeechService | null>(null);

  const currentPhrase: VoiceCheckPhrase = VOICE_CHECK_PHRASES[currentIndex];
  const currentResult = results[currentPhrase.id];

  const fixedNow = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => getTodayIndia(fixedNow), [fixedNow]);

  const accountAliases = useMemo(
    () => ({
      cash: 'Cash',
      hdfc: 'HDFC',
    }),
    []
  );

  const handleStartListening = async () => {
    if (speechState === 'listening' || speechState === 'processing') {
      if (activeServiceRef.current) {
        await activeServiceRef.current.stopListening();
      }
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setHeardTranscript('');

      const { service, selectedEngine: engineUsed } = await createSpeechService({
        engine: selectedEngine,
        whisperModelId: (whisperModel as WhisperModelId) || 'base',
        preferOnDevice,
        contextualStrings: Object.keys(keywordMap),
        categories: categories.map((c) => c.name),
        onFallback: (reason) => showBanner(reason, 4000),
      });

      activeServiceRef.current = service;
      const startTime = Date.now();

      await service.startListening({
        onStateChange: (st) => setSpeechState(st),
        onPartialTranscript: (text) => setHeardTranscript(text),
        onFinalTranscript: (text, details) => {
          const latency = details?.latencyMs ?? (Date.now() - startTime);
          setHeardTranscript(text);
          setSpeechState('idle');

          // Parse heard transcript
          const parsed = parseUtterance(
            text,
            fixedNow,
            'Asia/Kolkata',
            keywordMap,
            accountAliases
          );

          const expectedDate = getRelativeDateIndia(currentPhrase.expectedDateOffsetDays, fixedNow);
          const mismatches: string[] = [];

          if (parsed.type !== currentPhrase.expectedType) {
            mismatches.push(`Type: got ${parsed.type}, expected ${currentPhrase.expectedType}`);
          }
          if (parsed.amountPaise !== currentPhrase.expectedAmountPaise) {
            mismatches.push(
              `Amount: got ₹${(parsed.amountPaise || 0) / 100}, expected ₹${
                currentPhrase.expectedAmountPaise / 100
              }`
            );
          }
          if (
            (parsed.category || '').toLowerCase() !== currentPhrase.expectedCategory.toLowerCase()
          ) {
            mismatches.push(
              `Category: got ${parsed.category || 'None'}, expected ${currentPhrase.expectedCategory}`
            );
          }
          if (parsed.date !== expectedDate) {
            mismatches.push(`Date: got ${parsed.date}, expected ${expectedDate}`);
          }
          if (currentPhrase.expectedAccountAlias) {
            if (
              (parsed.accountAlias || '').toLowerCase() !==
              currentPhrase.expectedAccountAlias.toLowerCase()
            ) {
              mismatches.push(
                `Account: got ${parsed.accountAlias || 'None'}, expected ${
                  currentPhrase.expectedAccountAlias
                }`
              );
            }
          }

          const isPass = mismatches.length === 0;

          if (isPass) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }

          const attemptResult: CheckAttemptResult = {
            phraseId: currentPhrase.id,
            phrase: currentPhrase.phrase,
            heardText: text,
            parsed,
            expectedCategory: currentPhrase.expectedCategory,
            expectedAmountPaise: currentPhrase.expectedAmountPaise,
            expectedType: currentPhrase.expectedType,
            expectedDate,
            expectedAccountAlias: currentPhrase.expectedAccountAlias,
            isPass,
            mismatches,
            latencyMs: latency,
            engine: engineUsed,
          };

          setResults((prev) => ({
            ...prev,
            [currentPhrase.id]: attemptResult,
          }));
        },
        onError: (friendlyMsg) => {
          setSpeechState('error');
          showBanner(friendlyMsg);
        },
      });
    } catch (err: any) {
      setSpeechState('error');
      showBanner(err?.message || 'Speech recognition failed');
    }
  };

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    if (currentIndex < VOICE_CHECK_PHRASES.length - 1) {
      setCurrentIndex((i) => i + 1);
      setHeardTranscript('');
    }
  };

  const handlePrev = () => {
    Haptics.selectionAsync().catch(() => {});
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setHeardTranscript('');
    }
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const attemptList = Object.values(results);
    const totalAttempted = attemptList.length;
    const totalPassed = attemptList.filter((r) => r.isPass).length;
    const passRate = totalAttempted > 0 ? Math.round((totalPassed / totalAttempted) * 100) : 0;
    const avgLatency =
      totalAttempted > 0
        ? Math.round(attemptList.reduce((sum, r) => sum + r.latencyMs, 0) / totalAttempted)
        : 0;

    // Worst words / misrecognized tokens
    const failureWordCounts: Record<string, number> = {};
    for (const res of attemptList) {
      if (!res.isPass) {
        const words = res.phrase.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length >= 3) {
            failureWordCounts[w] = (failureWordCounts[w] || 0) + 1;
          }
        }
      }
    }

    const worstWords = Object.entries(failureWordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w, c]) => `${w} (${c})`);

    return {
      totalAttempted,
      totalPassed,
      passRate,
      avgLatency,
      worstWords,
    };
  }, [results]);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const dump = {
        exportedAt: new Date().toISOString(),
        summary: summaryMetrics,
        results: Object.values(results),
      };
      const jsonStr = JSON.stringify(dump, null, 2);

      const fileName = `wini-voice-check-${todayYmd}.json`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (baseDir) {
        const fileUri = `${baseDir}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Voice Check Results',
          });
          return;
        }
      }

      await Clipboard.setStringAsync(jsonStr);
      showBanner('Copied Voice Check results as JSON.');
    } catch (err: any) {
      showBanner(err?.message || 'Failed to export results');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const headers = [
        'ID',
        'Phrase',
        'Heard',
        'Pass',
        'LatencyMs',
        'ExpectedType',
        'ParsedType',
        'ExpectedAmount',
        'ParsedAmount',
        'ExpectedCategory',
        'ParsedCategory',
        'ExpectedDate',
        'ParsedDate',
        'Engine',
      ];

      const rows = Object.values(results).map((r) => [
        r.phraseId,
        `"${r.phrase.replace(/"/g, '""')}"`,
        `"${(r.heardText || '').replace(/"/g, '""')}"`,
        r.isPass ? 'PASS' : 'FAIL',
        r.latencyMs,
        r.expectedType,
        r.parsed.type,
        r.expectedAmountPaise / 100,
        (r.parsed.amountPaise || 0) / 100,
        r.expectedCategory,
        r.parsed.category || '',
        r.expectedDate,
        r.parsed.date,
        r.engine,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      const fileName = `wini-voice-check-${todayYmd}.csv`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (baseDir) {
        const fileUri = `${baseDir}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Voice Check CSV',
          });
          return;
        }
      }

      await Clipboard.setStringAsync(csvContent);
      showBanner('Copied Voice Check results as CSV.');
    } catch (err: any) {
      showBanner(err?.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Screen scrollable hasTabBar={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Back to Settings"
          >
            <Text style={[styles.backArrow, { color: themeColors.accent }]}>←</Text>
            <Text style={[styles.backText, { color: themeColors.accent }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Voice Check</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Read the standard 50 phrases aloud to verify speech recognition & parsing accuracy.
          </Text>
        </View>

        {/* Engine Toggle */}
        <View style={[styles.engineSelectCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.engineSelectTitle, { color: themeColors.textMuted }]}>ENGINE</Text>
          <View style={styles.engineButtonsRow}>
            <TouchableOpacity
              style={[
                styles.engineChoiceBtn,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                selectedEngine === 'expo' && { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedEngine('expo');
              }}
            >
              <Text
                style={[
                  styles.engineChoiceText,
                  { color: themeColors.textMuted },
                  selectedEngine === 'expo' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Phone Recognizer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineChoiceBtn,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                selectedEngine === 'whisper' && { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedEngine('whisper');
              }}
            >
              <Text
                style={[
                  styles.engineChoiceText,
                  { color: themeColors.textMuted },
                  selectedEngine === 'whisper' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Whisper (Local)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Phrase Test Card */}
        <Card variant="surface" style={styles.phraseCard}>
          <View style={styles.phraseHeaderRow}>
            <Text style={[styles.phraseBadge, { color: themeColors.accent }]}>
              PHRASE {currentPhrase.id} OF {VOICE_CHECK_PHRASES.length}
            </Text>
            {currentResult && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: currentResult.isPass ? `${colors.income}22` : `${colors.expense}22` },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: currentResult.isPass ? colors.income : colors.expense },
                  ]}
                >
                  {currentResult.isPass ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            )}
          </View>

          {/* Large Target Phrase */}
          <Text style={[styles.targetPhrase, { color: themeColors.text }]}>
            &ldquo;{currentPhrase.phrase}&rdquo;
          </Text>

          {/* Expected Chips */}
          <View style={styles.expectedChipsRow}>
            <GlassChip
              label="Type"
              valueText={currentPhrase.expectedType === 'income' ? 'Income' : 'Expense'}
              type={currentPhrase.expectedType === 'income' ? 'income' : 'expense'}
            />
            <GlassChip
              label="Amount"
              amountPaise={currentPhrase.expectedAmountPaise}
              type={currentPhrase.expectedType === 'income' ? 'income' : 'expense'}
            />
            <GlassChip
              label="Category"
              valueText={currentPhrase.expectedCategory}
              type="neutral"
            />
            <GlassChip
              label="Date"
              valueText={
                currentPhrase.expectedDateOffsetDays === 0
                  ? 'Today'
                  : currentPhrase.expectedDateOffsetDays === -1
                  ? 'Yesterday'
                  : 'Parso'
              }
              type="neutral"
            />
            {currentPhrase.expectedAccountAlias ? (
              <GlassChip
                label="Account"
                valueText={currentPhrase.expectedAccountAlias}
                type="neutral"
              />
            ) : null}
          </View>

          {/* Microphone Action */}
          <View style={styles.micCenterWrap}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                speechState === 'listening' && { borderColor: themeColors.accent, backgroundColor: `${themeColors.accent}22` },
              ]}
              onPress={handleStartListening}
              activeOpacity={0.8}
            >
              <MicIcon size={24} color={speechState === 'listening' ? themeColors.accent : colors.white} />
              <Text
                style={[
                  styles.micBtnText,
                  { color: themeColors.text },
                  speechState === 'listening' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                {speechState === 'listening' ? 'Listening...' : 'Tap to speak'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heard Output & Mismatches */}
          {heardTranscript || currentResult ? (
            <View style={[styles.heardSection, { backgroundColor: themeColors.surface2, borderColor: themeColors.border }]}>
              <Text style={[styles.heardLabel, { color: themeColors.textMuted }]}>HEARD</Text>
              <Text style={[styles.heardText, { color: themeColors.text }]}>
                {heardTranscript || currentResult?.heardText}
              </Text>

              {currentResult ? (
                <View style={styles.resultDetails}>
                  <View style={styles.latencyRow}>
                    <Text style={[styles.latencyText, { color: themeColors.textMuted }]}>
                      Latency: {currentResult.latencyMs}ms ({currentResult.engine})
                    </Text>
                  </View>

                  {!currentResult.isPass && currentResult.mismatches.length > 0 && (
                    <View style={styles.mismatchesWrap}>
                      {currentResult.mismatches.map((m, idx) => (
                        <Text key={idx} style={[styles.mismatchItem, { color: colors.expense }]}>
                          • {m}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Phrase Step Navigation */}
          <View style={styles.navButtonsRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && { opacity: 0.4 }]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
            >
              <Text style={[styles.navBtnText, { color: themeColors.text }]}>← Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navBtn,
                styles.navBtnPrimary,
                currentIndex === VOICE_CHECK_PHRASES.length - 1 && { opacity: 0.4 },
              ]}
              onPress={handleNext}
              disabled={currentIndex === VOICE_CHECK_PHRASES.length - 1}
            >
              <Text style={styles.navBtnPrimaryText}>Next Phrase →</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Overall Benchmark Summary Card */}
        <Card variant="surface" style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: themeColors.text }]}>
            Benchmark Summary
          </Text>
          <Text style={[styles.summarySub, { color: themeColors.textMuted }]}>
            Performance across tested phrases
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {summaryMetrics.totalPassed}/{summaryMetrics.totalAttempted}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Passed</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: themeColors.accent }]}>
                {summaryMetrics.passRate}%
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Pass Rate</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {summaryMetrics.avgLatency}ms
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Avg Latency</Text>
            </View>
          </View>

          {summaryMetrics.worstWords.length > 0 && (
            <View style={styles.worstWordsWrap}>
              <Text style={[styles.worstWordsTitle, { color: themeColors.textMuted }]}>
                MOST FREQUENT DIFFICULT WORDS
              </Text>
              <Text style={[styles.worstWordsText, { color: themeColors.text }]}>
                {summaryMetrics.worstWords.join(', ')}
              </Text>
            </View>
          )}

          {/* Export Actions */}
          <View style={styles.exportActionsRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: themeColors.surface2, borderColor: themeColors.border }]}
              onPress={handleExportJSON}
              disabled={isExporting || summaryMetrics.totalAttempted === 0}
              activeOpacity={0.8}
            >
              <ExportIcon size={16} color={themeColors.text} />
              <Text style={[styles.exportBtnText, { color: themeColors.text }]}>Export JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: themeColors.surface2, borderColor: themeColors.border }]}
              onPress={handleExportCSV}
              disabled={isExporting || summaryMetrics.totalAttempted === 0}
              activeOpacity={0.8}
            >
              <ExportIcon size={16} color={themeColors.text} />
              <Text style={[styles.exportBtnText, { color: themeColors.text }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

export default function VoiceCheckScreen() {
  return (
    <ErrorBoundary fallbackTitle="Voice Check Unavailable">
      <VoiceCheckContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  engineSelectCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  engineSelectTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
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
    alignItems: 'center',
    borderWidth: 1,
  },
  engineChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phraseCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  phraseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phraseBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  targetPhrase: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.displaySerif,
    lineHeight: 28,
  },
  expectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  micCenterWrap: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
    minWidth: 180,
    minHeight: 48,
  },
  micBtnText: {
    fontSize: 15,
    fontFamily: typography.bodyMedium,
  },
  heardSection: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  heardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heardText: {
    fontSize: 15,
    fontFamily: typography.bodyMedium,
  },
  resultDetails: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  latencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  latencyText: {
    fontSize: 11,
  },
  mismatchesWrap: {
    marginTop: spacing.xs,
    gap: 2,
  },
  mismatchItem: {
    fontSize: 12,
  },
  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  navBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    minHeight: 44,
  },
  navBtnPrimary: {
    backgroundColor: colors.white,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: typography.bodyMedium,
  },
  navBtnPrimaryText: {
    color: colors.black,
    fontSize: 14,
    fontFamily: typography.bodyBold,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
  },
  summarySub: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  worstWordsWrap: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  worstWordsTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  worstWordsText: {
    fontSize: 13,
  },
  exportActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  exportBtnText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium,
  },
});
