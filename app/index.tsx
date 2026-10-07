/**
 * Main Home Screen for Wini (Dashboard & Voice Entry).
 * Where it fits: The primary screen users see when opening Wini (`/`).
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.5, 1.6 & 1.8:
 * 1. Hero card (Month pill picker, eye toggle, net cashflow, Income & Expense glass chips)
 * 2. Cashflow card (Bar chart with Expenses | Income toggle, W1..W5 weekly buckets or Mon..Sun daily buckets)
 * 3. Category breakdown card (Donut chart & 3-column legend driven by shared Expenses | Income toggle)
 * 4. Recent 5 transactions list with "View all" lime link
 * 5. Floating bottom navigation with centre mic button (no quick-action row, no duplicate mic)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radii } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { formatRupees } from '../src/domain/money';
import { TransactionWithCategory, TransactionType } from '../src/domain/types';
import { TransactionModal } from '../src/ui/TransactionModal';
import { VoiceSheet } from '../src/ui/VoiceSheet';
import { ConfirmSheet } from '../src/ui/ConfirmSheet';
import { ParseResult } from '../src/parser';
import { processComposerInput } from '../src/domain/composerPipeline';
import { decideAddAction } from '../src/domain/autoAdd';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { useRouter } from 'expo-router';
import { ExpoSpeechService } from '../src/speech/ExpoSpeechService';
import {
  Screen,
  HeroCard,
  Card,
  SegmentedControl,
  PillSelector,
  BarChart,
  DonutChart,
  CategoryIcon,
  SectionHeader,
  BottomSheet,
  FloatingNav,
  Snackbar,
  type NavTabKey,
} from '../src/ui/kit';
import {
  getWeeklyBucketsForMonth,
  getDailyBucketsForWeek,
  calculateHomeTotals,
  getDonutBreakdownData,
} from '../src/domain/homeHelpers';
import { formatRelativeDate } from '../src/utils/microcopy';

function formatMonthYearDisplay(yearMonthStr: string): string {
  const [yearStr, monthStr] = yearMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function generateMonthOptions(): { key: string; label: string }[] {
  const now = new Date();
  const options: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ key, label });
  }
  return options;
}

const CASHFLOW_SEGMENTS = [
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
];

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
    categories,
    keywordMap,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    learnKeyword,
    bannerMessage,
    showBanner,
    keepVoiceLog,
    voiceEngine,
    autoAddMode,
    autoAddLimitPaise,
    addVoiceLog,
    updateVoiceLogSaved,
  } = useAppStore();

  const [hideBalances, setHideBalances] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');
  const [snackbarState, setSnackbarState] = useState<{
    visible: boolean;
    message: string;
    txId: string;
    txData: TransactionWithCategory;
  } | null>(null);

  // Month selection (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  // Shared Expenses | Income toggle ('expense' | 'income')
  const [activeCashflowType, setActiveCashflowType] = useState<'expense' | 'income'>('expense');

  // Granularity for BarChart: 'month' (W1..W5) or 'week' (Mon..Sun)
  const [barGranularity, setBarGranularity] = useState<'month' | 'week'>('month');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | undefined>(undefined);

  // Voice & Confirm sheets
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [voiceSheetMode, setVoiceSheetMode] = useState<'voice' | 'typed'>('voice');
  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptSource, setTranscriptSource] = useState<'voice' | 'typed'>('voice');
  const [activeVoiceLogId, setActiveVoiceLogId] = useState<string | null>(null);

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
      if (monthPickerVisible) {
        setMonthPickerVisible(false);
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
  }, [confirmSheetVisible, voiceSheetVisible, monthPickerVisible, modalVisible]);

  // Flatten all transactions
  const allTransactions = useMemo(() => {
    return groupedTransactions.flatMap((g) => g.transactions);
  }, [groupedTransactions]);

  // Recent 5 transactions across the entire ledger
  const recentTransactions = useMemo(() => {
    return allTransactions.slice(0, 5);
  }, [allTransactions]);

  // Month totals (Net Cashflow, Income, Expense)
  const homeTotals = useMemo(() => {
    return calculateHomeTotals(allTransactions, selectedMonth);
  }, [allTransactions, selectedMonth]);

  // BarChart data (Weekly W1..W5 or Daily Mon..Sun)
  const barBuckets = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    if (barGranularity === 'week') {
      const todayYmd = new Date().toISOString().substring(0, 10);
      return getDailyBucketsForWeek(todayYmd, allTransactions, activeCashflowType);
    }
    return getWeeklyBucketsForMonth(year, month, allTransactions, activeCashflowType);
  }, [selectedMonth, allTransactions, activeCashflowType, barGranularity]);

  const barChartData = useMemo(() => {
    return barBuckets.map((b) => ({
      key: b.id,
      label: b.label,
      subLabel: b.subLabel,
      amountPaise: b.amountPaise,
    }));
  }, [barBuckets]);

  // DonutChart data & 3-column legend
  const donutData = useMemo(() => {
    return getDonutBreakdownData(allTransactions, selectedMonth, activeCashflowType);
  }, [allTransactions, selectedMonth, activeCashflowType]);

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

  const openEditModal = (tx: TransactionWithCategory) => {
    Haptics.selectionAsync().catch(() => {});
    setEditingTransaction(tx);
    setModalDefaultType(tx.type);
    setModalVisible(true);
  };

  const handleTranscriptReady = async (
    transcript: string,
    source: 'voice' | 'typed',
    details?: { alternatives?: string[]; latencyMs?: number; engine?: string }
  ) => {
    setVoiceSheetVisible(false);
    setTranscriptSource(source);

    const { parsed, effectiveTranscript, candidates } = processComposerInput({
      text: transcript,
      source,
      alternatives: details?.alternatives,
      now: new Date(),
      timeZone: 'Asia/Kolkata',
      keywordMap,
    });

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

    const decision = decideAddAction(
      parsed,
      {
        autoAddMode,
        autoAddLimitPaise,
      },
      new Date()
    );

    if (decision === 'auto') {
      const foundCat =
        categories.find(
          (c) => c.name.toLowerCase() === parsed.category?.toLowerCase()
        ) || categories[0];

      const savedTx = await addTransaction({
        type: parsed.type,
        amount_paise: parsed.amountPaise!,
        category_id: foundCat ? foundCat.id : '',
        note: parsed.note,
        occurred_on: parsed.date,
        source,
        raw_text: effectiveTranscript,
      });

      if (logId) {
        const finalJson = JSON.stringify({
          type: parsed.type,
          amountPaise: parsed.amountPaise,
          categoryId: foundCat ? foundCat.id : '',
          note: parsed.note,
          occurredOn: parsed.date,
        });
        await updateVoiceLogSaved(logId, finalJson, false);
        setActiveVoiceLogId(null);
      }

      // Haptic feedback on auto-save
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const catName = foundCat?.name || 'General';
      const relDate = formatRelativeDate(parsed.date);
      const msg = `Added ${formatRupees(parsed.amountPaise!)} · ${catName} · ${relDate}`;

      const fullTx: TransactionWithCategory = {
        id: savedTx.id,
        type: savedTx.type,
        amount_paise: savedTx.amount_paise,
        category_id: savedTx.category_id,
        category_name: foundCat?.name,
        category_icon: foundCat?.icon,
        category_color: foundCat?.color,
        note: savedTx.note,
        occurred_on: savedTx.occurred_on,
        source: savedTx.source,
        raw_text: savedTx.raw_text,
        device_id: savedTx.device_id,
        created_at: savedTx.created_at,
        updated_at: savedTx.updated_at,
        deleted_at: savedTx.deleted_at,
      };

      setSnackbarState({
        visible: true,
        message: msg,
        txId: savedTx.id,
        txData: fullTx,
      });
      return;
    }

    // If confidence is low or amount could not be parsed, route directly to edit form pre-filled
    if (decision === 'edit' || parsed.confidence < 0.6 || !parsed.amountPaise) {
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

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  return (
    <Screen hasTabBar scrollable>
      {/* Floating Global Banner Notification */}
      {bannerMessage && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      )}

      <View style={styles.container}>
        {/* ── 1. Hero Card ────────────────────────────────────────── */}
        <HeroCard
          monthLabel={formatMonthYearDisplay(selectedMonth)}
          netCashflowPaise={homeTotals.netPaise}
          incomePaise={homeTotals.incomePaise}
          expensePaise={homeTotals.expensePaise}
          hideAmounts={hideBalances}
          onToggleHideAmounts={() => {
            Haptics.selectionAsync().catch(() => {});
            setHideBalances(!hideBalances);
          }}
          onMonthPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setMonthPickerVisible(true);
          }}
          style={styles.heroCard}
        />

        {/* ── 2. Cashflow Card ────────────────────────────────────── */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.toggleWrap}>
              <SegmentedControl
                options={CASHFLOW_SEGMENTS}
                selectedKey={activeCashflowType}
                onChange={(key) => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveCashflowType(key as 'expense' | 'income');
                }}
              />
            </View>
            <PillSelector
              label={barGranularity === 'month' ? 'Month' : 'Week'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setBarGranularity(barGranularity === 'month' ? 'week' : 'month');
              }}
            />
          </View>

          <BarChart
            data={barChartData}
            selectedIndex={selectedBarIndex}
            onSelectIndex={(idx) => {
              Haptics.selectionAsync().catch(() => {});
              setSelectedBarIndex(idx);
            }}
          />
        </Card>

        {/* ── 3. Category Breakdown Card ──────────────────────────── */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          <Text style={styles.cardSubtitle}>
            {activeCashflowType === 'income' ? 'Income' : 'Expense'} distribution for{' '}
            {formatMonthYearDisplay(selectedMonth)}
          </Text>

          <DonutChart
            segments={donutData.segments}
            centerTitle={activeCashflowType === 'income' ? 'Total income' : 'Total expenses'}
            centerAmount={hideBalances ? '••••••' : formatRupees(donutData.totalPaise)}
            showLegend={false}
          />

          {/* 3-Column Legend */}
          {donutData.legend.length > 0 && (
            <View style={styles.legendGrid}>
              {donutData.legend.map((item) => (
                <View key={item.categoryId} style={styles.legendCol}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <View style={styles.legendTextWrap}>
                    <Text style={styles.legendName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.legendPct}>
                      {item.percentage}% ({hideBalances ? '••••' : formatRupees(item.amountPaise)})
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── 4. Recent Transactions ─────────────────────────────── */}
        <View style={styles.recentSection}>
          <SectionHeader
            title="Recent Transactions"
            actionText="View all"
            onAction={() => router.push('/history')}
          />

          {recentTransactions.length === 0 ? (
            <Card variant="surface" style={styles.emptyCard}>
              <CategoryIcon name="sparkles-outline" size="md" variant="glass" />
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the microphone below to speak your first expense.
              </Text>
            </Card>
          ) : (
            <View style={styles.txList}>
              {recentTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() => openEditModal(tx)}
                  activeOpacity={0.7}
                >
                  <CategoryIcon
                    name={tx.category_icon}
                    color={tx.category_color}
                    size="sm"
                    variant="glass"
                  />
                  <View style={styles.txDetails}>
                    <Text style={styles.txNote} numberOfLines={1}>
                      {tx.note || tx.category_name || 'General'}
                    </Text>
                    <Text style={styles.txCategory}>
                      {tx.category_name || 'General'} • {formatRelativeDate(tx.occurred_on)}
                      {tx.source === 'voice' && ' • Voice'}
                      {tx.source === 'typed' && ' • Typed'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.type === 'income' ? styles.txAmountIncome : styles.txAmountExpense,
                    ]}
                  >
                    {hideBalances
                      ? '••••••'
                      : `${tx.type === 'income' ? '+' : '-'}${formatRupees(tx.amount_paise)}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── 5. Floating Bottom Navigation ───────────────────────── */}
      <FloatingNav
        activeTab="home"
        onSelectTab={(tab: NavTabKey) => {
          if (tab === 'home') return;
          if (tab === 'reports') router.push('/insights');
          else if (tab === 'accounts') router.push('/accounts' as any);
          else if (tab === 'settings') router.push('/settings');
        }}
        onCenterAction={openVoiceAdd}
      />

      {/* ── Month Picker Sheet ──────────────────────────────────── */}
      <BottomSheet
        visible={monthPickerVisible}
        title="Select Month"
        onClose={() => setMonthPickerVisible(false)}
      >
        <View style={styles.monthOptionsList}>
          {monthOptions.map((opt) => {
            const isSelected = opt.key === selectedMonth;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.monthOptionRow,
                  isSelected && styles.monthOptionRowSelected,
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedMonth(opt.key);
                  setMonthPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.monthOptionText,
                    isSelected && styles.monthOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      {/* ── Voice & Typed Input Sheet ───────────────────────────── */}
      <VoiceSheet
        visible={voiceSheetVisible}
        initialMode={voiceSheetMode}
        onTranscriptReady={handleTranscriptReady}
        onClose={() => setVoiceSheetVisible(false)}
      />

      {/* ── Verification Confirm Sheet ──────────────────────────── */}
      <ConfirmSheet
        visible={confirmSheetVisible}
        parsed={parsedResult}
        rawTranscript={currentTranscript}
        source={transcriptSource}
        categories={categories}
        onSave={handleConfirmSave}
        onEdit={(data) => {
          setConfirmSheetVisible(false);
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

      {/* ── Manual Add / Edit Transaction Modal ─────────────────── */}
      <TransactionModal
        visible={modalVisible}
        initialTransaction={editingTransaction}
        defaultType={modalDefaultType}
        categories={categories}
        onSave={async (data) => {
          if (editingTransaction && editingTransaction.id) {
            await updateTransaction(editingTransaction.id, {
              type: data.type,
              amount_paise: data.amountPaise,
              category_id: data.categoryId,
              note: data.note,
              occurred_on: data.occurredOn,
            });
            showBanner('Transaction updated');
          } else {
            await addTransaction({
              type: data.type,
              amount_paise: data.amountPaise,
              category_id: data.categoryId,
              note: data.note,
              occurred_on: data.occurredOn,
              source: 'typed',
            });
            showBanner('Transaction added');
          }
          setModalVisible(false);
          setEditingTransaction(null);
        }}
        onClose={() => {
          setModalVisible(false);
          setEditingTransaction(null);
        }}
      />

      {/* ── Auto-Add 8s Undo/Edit Snackbar ───────────────────────── */}
      <Snackbar
        visible={!!snackbarState?.visible}
        message={snackbarState?.message || ''}
        durationMs={8000}
        onUndo={async () => {
          if (snackbarState) {
            await deleteTransaction(snackbarState.txId);
            setSnackbarState(null);
            showBanner('Transaction undone');
          }
        }}
        onEdit={() => {
          if (snackbarState) {
            const tx = snackbarState.txData;
            setSnackbarState(null);
            setEditingTransaction(tx);
            setModalDefaultType(tx.type);
            setModalVisible(true);
          }
        }}
        onDismiss={() => setSnackbarState(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    marginBottom: spacing.xs,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  toggleWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeBase,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginBottom: spacing.xs,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendCol: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  legendTextWrap: {
    flex: 1,
  },
  legendName: {
    color: colors.text,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeXs,
  },
  legendPct: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 10,
  },
  recentSection: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeBase,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    textAlign: 'center',
  },
  txList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  txDetails: {
    flex: 1,
  },
  txNote: {
    color: colors.text,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  txCategory: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  txAmountIncome: {
    color: colors.income,
  },
  txAmountExpense: {
    color: colors.expense,
  },
  banner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    zIndex: 999,
    alignItems: 'center',
  },
  bannerText: {
    color: colors.black,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  monthOptionsList: {
    paddingVertical: spacing.sm,
  },
  monthOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  monthOptionRowSelected: {
    backgroundColor: colors.surface2,
  },
  monthOptionText: {
    color: colors.text,
    fontFamily: typography.body,
    fontSize: typography.sizeBase,
  },
  monthOptionTextSelected: {
    color: colors.accent,
    fontFamily: typography.bodySemiBold,
  },
  checkMark: {
    color: colors.accent,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeBase,
  },
});

export default function HomeScreen() {
  return (
    <ErrorBoundary fallbackTitle="Dashboard Unavailable">
      <HomeContent />
    </ErrorBoundary>
  );
}
