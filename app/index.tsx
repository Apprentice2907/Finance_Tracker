/**
 * Main Home Screen for Wini (Wallet Dashboard & Voice Entry).
 * Where it fits: The primary screen users see when opening Wini (`/`).
 *
 * Beginner note: This screen brings together our wallet-style stacked cards (animated
 * using `react-native-reanimated`), the quick-action glass buttons, recent transactions
 * with swipe-to-delete + undo, and the docked floating microphone button.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { formatRupees } from '../src/domain/money';
import { TransactionWithCategory, TransactionType } from '../src/domain/types';
import {
  EyeIcon,
  PlusIcon,
  TrashIcon,
  MicIcon,
  KeyboardIcon,
  ArrowTrendUpIcon,
  ArrowTrendDownIcon,
  ChartIcon,
} from '../src/ui/icons';
import { TransactionModal } from '../src/ui/TransactionModal';
import { VoiceSheet } from '../src/ui/VoiceSheet';
import { ConfirmSheet } from '../src/ui/ConfirmSheet';
import { parseBestAlternative, ParseResult } from '../src/parser';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { useRouter } from 'expo-router';
import { ExpoSpeechService } from '../src/speech/ExpoSpeechService';
import { Ionicons } from '@expo/vector-icons';
import { Screen, CategoryIcon } from '../src/ui/kit';
import { formatRelativeDate, formatChange, pluralize } from '../src/utils/microcopy';

function HomeContent() {
  const router = useRouter();
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(Platform.OS !== 'web');

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === 'web') {
      try {
        const speech = new ExpoSpeechService();
        speech
          .isAvailable()
          .then((avail) => {
            if (!cancelled && avail) {
              setIsSpeechAvailable(true);
            }
          })
          .catch(() => {});
      } catch {
        // Speech unavailable on this web browser; remains false
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);
  const {
    groupedTransactions,
    currentMonthTotals,
    todayTotals,
    changeVsLastMonthPercent,
    categories,
    keywordMap,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    undoDelete,
    learnKeyword,
    lastDeletedTransaction,
    bannerMessage,
    showBanner,
    keepVoiceLog,
    voiceEngine,
    addVoiceLog,
    updateVoiceLogSaved,
  } = useAppStore();

  const [hideBalances, setHideBalances] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');
  const [activeCardIndex, setActiveCardIndex] = useState(0); // 0: Month Expense, 1: Today Expense, 2: Month Income

  // Voice & Confirm sheets
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [voiceSheetMode, setVoiceSheetMode] = useState<'voice' | 'typed'>('voice');
  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptSource, setTranscriptSource] = useState<'voice' | 'typed'>('voice');
  const [activeVoiceLogId, setActiveVoiceLogId] = useState<string | null>(null);

  // Reanimated values for card transitions
  const cardScale = useSharedValue(1);
  const micPulse = useSharedValue(1);

  // Pulsating animation for docked mic button
  useEffect(() => {
    micPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200 }),
        withTiming(1.0, { duration: 1200 })
      ),
      -1,
      true
    );
  }, [micPulse]);

  const micRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
    opacity: 0.35 + (micPulse.value - 1) * 1.5,
  }));

  // Hardware Back Button handling on Android: close open sheets first
  useEffect(() => {
    const onBackPress = () => {
      if (confirmSheetVisible) {
        setConfirmSheetVisible(false);
        return true;
      }
      if (voiceSheetVisible) {
        setVoiceSheetVisible(false);
        return true;
      }
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [confirmSheetVisible, voiceSheetVisible, modalVisible]);

  const recentTransactions = groupedTransactions.flatMap((g) => g.transactions).slice(0, 10);

  const handleCardSwitch = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    cardScale.value = 0.96;
    cardScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    setActiveCardIndex(index);
  };

  const mainCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const openVoiceAdd = () => {
    if (Platform.OS === 'web' && !isSpeechAvailable) {
      openTypeAdd();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setVoiceSheetMode('voice');
    setVoiceSheetVisible(true);
  };

  const openTypeAdd = () => {
    Haptics.selectionAsync().catch(() => {});
    setVoiceSheetMode('typed');
    setVoiceSheetVisible(true);
  };

  const openAddModal = (type: TransactionType = 'expense') => {
    Haptics.selectionAsync().catch(() => {});
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalVisible(true);
  };

  const openEditModal = (tx: TransactionWithCategory) => {
    Haptics.selectionAsync().catch(() => {});
    setEditingTransaction(tx);
    setModalDefaultType(tx.type);
    setModalVisible(true);
  };

  const handleDeleteWithFeedback = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await deleteTransaction(id);
  };

  const handleTranscriptReady = async (
    transcript: string,
    source: 'voice' | 'typed',
    details?: { alternatives?: string[]; latencyMs?: number; engine?: string }
  ) => {
    setVoiceSheetVisible(false);
    setTranscriptSource(source);

    const candidates =
      details?.alternatives && details.alternatives.length > 0
        ? details.alternatives
        : [transcript];

    const { bestParsed, bestTranscript } = parseBestAlternative(
      candidates,
      new Date(),
      'Asia/Kolkata',
      keywordMap
    );

    const parsed = bestParsed;
    const effectiveTranscript = bestTranscript || transcript;
    setCurrentTranscript(effectiveTranscript);

    let logId: string | null = null;
    if (source === 'voice' && keepVoiceLog) {
      try {
        const entry = await addVoiceLog({
          engine: details?.engine || voiceEngine || 'expo',
          raw_transcript: effectiveTranscript,
          alternatives_json: JSON.stringify(candidates),
          parsed_json: JSON.stringify(parsed),
          final_saved_json: null,
          corrected: false,
          latency_ms: details?.latencyMs || 0,
        });
        logId = entry?.id || null;
      } catch (err) {
        console.error('Failed to log voice utterance:', err);
      }
    }
    setActiveVoiceLogId(logId);

    // If confidence is low or amount could not be parsed, route directly to edit form pre-filled
    if (parsed.confidence < 0.6 || !parsed.amountPaise) {
      showBanner('Low confidence — please review and complete details');
      const foundCat = categories.find(
        (c) => c.name.toLowerCase() === parsed.category?.toLowerCase()
      );
      setEditingTransaction({
        id: '',
        type: parsed.type,
        amount_paise: parsed.amountPaise || 0,
        category_id: foundCat?.id || categories[0]?.id || '',
        note: parsed.note,
        occurred_on: parsed.date,
        source,
        raw_text: transcript,
        device_id: '',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      });
      setModalDefaultType(parsed.type);
      setModalVisible(true);
      return;
    }

    setParsedResult(parsed);
    setConfirmSheetVisible(true);
  };

  const handleConfirmSave = async (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
    source: 'voice' | 'typed';
    rawText: string;
    learnedWord?: string;
    corrected?: boolean;
  }) => {
    await addTransaction({
      type: data.type,
      amount_paise: data.amountPaise,
      category_id: data.categoryId,
      note: data.note,
      occurred_on: data.occurredOn,
      source: data.source,
      raw_text: data.rawText,
    });

    if (data.learnedWord) {
      await learnKeyword(data.learnedWord, data.categoryId);
    }

    if (activeVoiceLogId) {
      const finalJson = JSON.stringify({
        type: data.type,
        amountPaise: data.amountPaise,
        categoryId: data.categoryId,
        note: data.note,
        occurredOn: data.occurredOn,
      });
      await updateVoiceLogSaved(activeVoiceLogId, finalJson, Boolean(data.corrected));
      setActiveVoiceLogId(null);
    }

    const cat = categories.find((c) => c.id === data.categoryId);
    const catName = cat?.name || 'General';
    showBanner(`Added ${formatRupees(data.amountPaise)} for ${catName}.`);
  };

  const handleSaveManual = async (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
  }) => {
    if (activeVoiceLogId) {
      const finalJson = JSON.stringify({
        type: data.type,
        amountPaise: data.amountPaise,
        categoryId: data.categoryId,
        note: data.note,
        occurredOn: data.occurredOn,
      });
      await updateVoiceLogSaved(activeVoiceLogId, finalJson, true);
      setActiveVoiceLogId(null);
    }

    if (editingTransaction && editingTransaction.id) {
      await updateTransaction(editingTransaction.id, {
        type: data.type,
        amount_paise: data.amountPaise,
        category_id: data.categoryId,
        note: data.note,
        occurred_on: data.occurredOn,
      });
      showBanner('Transaction updated.');
    } else {
      await addTransaction({
        type: data.type,
        amount_paise: data.amountPaise,
        category_id: data.categoryId,
        note: data.note,
        occurred_on: data.occurredOn,
        source: 'manual',
      });
      const cat = categories.find((c) => c.id === data.categoryId);
      showBanner(`Added ${formatRupees(data.amountPaise)} for ${cat?.name || 'General'}.`);
    }
  };

  return (
    <Screen scrollable={true} hasTabBar={true} contentContainerStyle={styles.scrollContent}>
      {/* Floating Global Banner Notification */}
      {bannerMessage && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      )}

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Wini Wallet</Text>
            <Text style={styles.subGreeting}>Voice-first personal finance</Text>
          </View>
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setHideBalances(!hideBalances);
            }}
            hitSlop={12}
            accessibilityLabel="Toggle balance visibility"
          >
            <EyeIcon size={20} color={colors.textSecondary} visible={!hideBalances} />
          </TouchableOpacity>
        </View>

        {/* Stacked Wallet Cards */}
        <View style={styles.walletContainer}>
          {/* Peek Card: Income this month (Back) */}
          <TouchableOpacity
            style={[
              styles.peekCard,
              styles.peekCardBack,
              activeCardIndex === 2 && styles.peekCardSelected,
            ]}
            onPress={() => handleCardSwitch(2)}
            activeOpacity={0.88}
          >
            <Text style={styles.peekLabel}>Income this month</Text>
            <Text style={[styles.peekAmount, { color: colors.income }]}>
              {hideBalances ? '••••' : formatRupees(currentMonthTotals.totalIncomePaise)}
            </Text>
          </TouchableOpacity>

          {/* Peek Card: Spent today (Middle) */}
          <TouchableOpacity
            style={[
              styles.peekCard,
              styles.peekCardMiddle,
              activeCardIndex === 1 && styles.peekCardSelected,
            ]}
            onPress={() => handleCardSwitch(1)}
            activeOpacity={0.88}
          >
            <Text style={styles.peekLabel}>Spent today</Text>
            <Text style={styles.peekAmount}>
              {hideBalances ? '••••' : formatRupees(todayTotals.totalExpensePaise)}
            </Text>
          </TouchableOpacity>

          {/* Foreground Active Card */}
          <Animated.View style={[styles.mainCard, mainCardAnimatedStyle]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardLabel}>
                  {activeCardIndex === 0
                    ? 'This month spent'
                    : activeCardIndex === 1
                    ? 'Spent today'
                    : 'Income this month'}
                </Text>
              </View>

              {/* Tag & Change vs last month chip */}
              <View style={styles.chipRow}>
                {activeCardIndex === 0 && changeVsLastMonthPercent !== null && (
                  <View
                    style={[
                      styles.changeChip,
                      changeVsLastMonthPercent > 0
                        ? styles.changeChipUp
                        : styles.changeChipDown,
                    ]}
                  >
                    {changeVsLastMonthPercent > 0 ? (
                      <ArrowTrendUpIcon size={12} color={colors.expense} />
                    ) : (
                      <ArrowTrendDownIcon size={12} color={colors.income} />
                    )}
                    <Text
                      style={[
                        styles.changeChipText,
                        changeVsLastMonthPercent > 0
                          ? { color: colors.expense }
                          : { color: colors.income },
                      ]}
                    >
                      {Math.abs(changeVsLastMonthPercent)}% vs last mo
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.tag,
                    activeCardIndex === 2 ? styles.tagIncome : styles.tagExpense,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      activeCardIndex === 2 ? { color: colors.income } : { color: colors.primary },
                    ]}
                  >
                    {activeCardIndex === 2 ? 'Income' : 'Expense'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.balanceText}>
              {hideBalances
                ? '••••••'
                : formatRupees(
                    activeCardIndex === 0
                      ? currentMonthTotals.totalExpensePaise
                      : activeCardIndex === 1
                      ? todayTotals.totalExpensePaise
                      : currentMonthTotals.totalIncomePaise
                  )}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.footerNote}>
                {activeCardIndex === 0
                  ? `${currentMonthTotals.count} transactions recorded`
                  : activeCardIndex === 1
                  ? `${todayTotals.count} entries today`
                  : `Net: ${formatRupees(currentMonthTotals.netPaise, true)}`}
              </Text>

              {activeCardIndex !== 0 && (
                <TouchableOpacity
                  onPress={() => handleCardSwitch(0)}
                  hitSlop={8}
                >
                  <Text style={styles.resetCardText}>Back to Month</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Quick Actions Row (Glass style buttons) */}
        <View style={styles.quickActions}>
          {/* Voice Add (hidden on web if browser speech recognition is unavailable) */}
          {!(Platform.OS === 'web' && !isSpeechAvailable) && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnVoice]}
              onPress={openVoiceAdd}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconWrapPrimary}>
                <MicIcon size={15} color={colors.white} />
              </View>
              <Text style={styles.actionBtnText}>Voice Add</Text>
            </TouchableOpacity>
          )}

          {/* Type Add */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={openTypeAdd}
            activeOpacity={0.8}
          >
            <View style={styles.btnIconWrapDefault}>
              <KeyboardIcon size={15} color={colors.text} />
            </View>
            <Text style={styles.actionBtnText}>Type Add</Text>
          </TouchableOpacity>

          {/* Add Income */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openAddModal('income')}
            activeOpacity={0.8}
          >
            <View style={styles.btnIconWrapIncome}>
              <PlusIcon size={15} color={colors.income} />
            </View>
            <Text style={styles.actionBtnText}>Income</Text>
          </TouchableOpacity>

          {/* Insights shortcut */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/insights')}
            activeOpacity={0.8}
          >
            <View style={styles.btnIconWrapInsights}>
              <ChartIcon size={15} color={colors.accentPurple} />
            </View>
            <Text style={styles.actionBtnText}>Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Entries Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <TouchableOpacity
            onPress={() => router.push('/history')}
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the big mic below or &quot;Voice Add&quot; to speak your first expense.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {recentTransactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txRow}
                onPress={() => openEditModal(tx)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.txEmojiBox,
                    { backgroundColor: tx.category_color ? `${tx.category_color}22` : colors.elevated },
                  ]}
                >
                  <CategoryIcon name={tx.category_icon} color={tx.category_color} size={18} variant="plain" />
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txNote} numberOfLines={1}>
                    {tx.note}
                  </Text>
                  <Text style={styles.txCategory}>
                    {tx.category_name || 'General'} • {formatRelativeDate(tx.occurred_on)}
                    {tx.source === 'voice' && ' • Voice'}
                    {tx.source === 'typed' && ' • Typed'}
                  </Text>
                </View>

                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.type === 'income' ? styles.txAmountIncome : styles.txAmountExpense,
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatRupees(tx.amount_paise)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteWithFeedback(tx.id)}
                    hitSlop={12}
                    style={styles.deleteIcon}
                    accessibilityLabel="Delete entry"
                  >
                    <TrashIcon size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Docked Centered Big Mic Button with Pulsating Outer Ring (hidden on web if unavailable) */}
      {!(Platform.OS === 'web' && !isSpeechAvailable) && (
        <View style={styles.dockedMicContainer} pointerEvents="box-none">
          <Animated.View style={[styles.dockedMicGlow, micRingStyle]} />
          <TouchableOpacity
            style={styles.dockedMicButton}
            onPress={openVoiceAdd}
            activeOpacity={0.85}
            accessibilityLabel="Record voice expense"
          >
            <MicIcon size={30} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Undo Snackbar */}
      {lastDeletedTransaction && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Entry deleted</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              undoDelete();
            }}
            hitSlop={8}
          >
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Voice & Typed Input Sheet */}
      <VoiceSheet
        visible={voiceSheetVisible}
        initialMode={voiceSheetMode}
        onClose={() => setVoiceSheetVisible(false)}
        onTranscriptReady={handleTranscriptReady}
      />

      {/* Confirmation Sheet */}
      <ConfirmSheet
        visible={confirmSheetVisible}
        parsed={parsedResult}
        rawTranscript={currentTranscript}
        source={transcriptSource}
        categories={categories}
        onSave={handleConfirmSave}
        onEdit={(data) => {
          setEditingTransaction({
            id: '',
            type: data.type,
            amount_paise: data.amountPaise,
            category_id: data.categoryId,
            note: data.note,
            occurred_on: data.occurredOn,
            source: data.source,
            raw_text: data.rawText,
            device_id: '',
            created_at: '',
            updated_at: '',
            deleted_at: null,
          });
          setModalDefaultType(data.type);
          setModalVisible(true);
        }}
        onClose={() => setConfirmSheetVisible(false)}
      />

      {/* Add / Edit Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveManual}
        categories={categories}
        initialTransaction={editingTransaction}
        defaultType={modalDefaultType}
      />
    </Screen>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary fallbackTitle="Home Screen unavailable">
      <HomeContent />
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
    paddingBottom: 110, // accommodate docked mic
  },
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 9999,
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
  },
  subGreeting: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  eyeBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletContainer: {
    position: 'relative',
    height: 204,
    marginBottom: spacing.xl,
  },
  peekCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  peekCardBack: {
    top: 0,
    backgroundColor: colors.surfaceAlt,
    borderColor: 'rgba(46, 204, 143, 0.25)',
    borderWidth: 1,
    height: 76,
  },
  peekCardMiddle: {
    top: 14,
    backgroundColor: colors.surfaceInput,
    borderColor: 'rgba(59, 110, 245, 0.25)',
    borderWidth: 1,
    height: 76,
  },
  peekCardSelected: {
    borderColor: colors.primary,
  },
  peekLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  peekAmount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  mainCard: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderColor: colors.elevatedBorder,
    borderWidth: 1.5,
    borderRadius: radii.xl,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    gap: 3,
  },
  changeChipUp: {
    backgroundColor: colors.expenseMuted,
  },
  changeChipDown: {
    backgroundColor: colors.incomeMuted,
  },
  changeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tagExpense: {
    backgroundColor: colors.primaryMuted,
  },
  tagIncome: {
    backgroundColor: colors.incomeMuted,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceText: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '700',
    fontFamily: typography.displaySerif,
    marginVertical: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  footerNote: {
    color: colors.muted,
    fontSize: 12,
  },
  resetCardText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actionBtnVoice: {
    backgroundColor: colors.primaryMuted,
    borderColor: 'rgba(59, 110, 245, 0.4)',
  },
  btnIconWrapPrimary: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  btnIconWrapDefault: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  btnIconWrapIncome: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: colors.incomeMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  btnIconWrapInsights: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: 'rgba(157, 140, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txEmoji: {
    fontSize: 22,
  },
  txDetails: {
    flex: 1,
  },
  txNote: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  txCategory: {
    color: colors.muted,
    fontSize: 12,
  },
  txRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  txAmountExpense: {
    color: colors.text,
  },
  txAmountIncome: {
    color: colors.income,
  },
  deleteIcon: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  dockedMicContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  dockedMicGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
  },
  dockedMicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  snackbar: {
    position: 'absolute',
    bottom: 84,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  snackbarText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  undoText: {
    color: colors.warning,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
