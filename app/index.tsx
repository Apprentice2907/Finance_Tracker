import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { formatRupees } from '../src/domain/money';
import { TransactionWithCategory, TransactionType } from '../src/domain/types';
import { EyeIcon, PlusIcon, TrashIcon, MicIcon } from '../src/ui/icons';
import { TransactionModal } from '../src/ui/TransactionModal';
import { VoiceSheet } from '../src/ui/VoiceSheet';
import { ConfirmSheet } from '../src/ui/ConfirmSheet';
import { parseUtterance, ParseResult } from '../src/parser';

export default function HomeScreen() {
  const {
    groupedTransactions,
    currentMonthTotals,
    todayTotals,
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
  } = useAppStore();

  const [hideBalances, setHideBalances] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Voice & Confirm sheets
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptSource, setTranscriptSource] = useState<'voice' | 'typed'>('voice');

  const recentTransactions = groupedTransactions.flatMap((g) => g.transactions).slice(0, 10);

  const openAddModal = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalVisible(true);
  };

  const openEditModal = (tx: TransactionWithCategory) => {
    setEditingTransaction(tx);
    setModalDefaultType(tx.type);
    setModalVisible(true);
  };

  const handleTranscriptReady = (transcript: string, source: 'voice' | 'typed') => {
    setVoiceSheetVisible(false);
    setCurrentTranscript(transcript);
    setTranscriptSource(source);

    const parsed = parseUtterance(transcript, new Date(), 'Asia/Kolkata', keywordMap);

    // If confidence is low or amount could not be parsed, open edit form pre-filled
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Floating Global Banner Notification */}
      {bannerMessage && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Wini Wallet 🛺</Text>
            <Text style={styles.subGreeting}>Track expenses with your voice</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setHideBalances(!hideBalances)}
            hitSlop={8}
          >
            <EyeIcon size={20} color={colors.textSecondary} visible={!hideBalances} />
          </TouchableOpacity>
        </View>

        {/* Stacked Wallet Cards */}
        <View style={styles.walletContainer}>
          {/* Background Peek Card 2: Income */}
          <TouchableOpacity
            style={[styles.peekCard, styles.peekCardBack]}
            onPress={() => setActiveCardIndex(2)}
            activeOpacity={0.9}
          >
            <Text style={styles.peekLabel}>Income this month</Text>
            <Text style={[styles.peekAmount, { color: colors.income }]}>
              {hideBalances ? '••••' : formatRupees(currentMonthTotals.totalIncomePaise)}
            </Text>
          </TouchableOpacity>

          {/* Background Peek Card 1: Today */}
          <TouchableOpacity
            style={[styles.peekCard, styles.peekCardMiddle]}
            onPress={() => setActiveCardIndex(1)}
            activeOpacity={0.9}
          >
            <Text style={styles.peekLabel}>Spent today</Text>
            <Text style={styles.peekAmount}>
              {hideBalances ? '••••' : formatRupees(todayTotals.totalExpensePaise)}
            </Text>
          </TouchableOpacity>

          {/* Foreground Main Card */}
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>
                {activeCardIndex === 0
                  ? 'This month spent'
                  : activeCardIndex === 1
                  ? 'Spent today'
                  : 'Income this month'}
              </Text>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {activeCardIndex === 2 ? 'Income' : 'Expense'}
                </Text>
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
                <TouchableOpacity onPress={() => setActiveCardIndex(0)}>
                  <Text style={styles.resetCardText}>Back to Month</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setVoiceSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.btnIconWrap}>
              <MicIcon size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.actionBtnText}>Voice Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnManual]}
            onPress={() => openAddModal('expense')}
            activeOpacity={0.8}
          >
            <View style={[styles.btnIconWrap, { backgroundColor: colors.surface }]}>
              <PlusIcon size={16} color={colors.text} />
            </View>
            <Text style={styles.actionBtnText}>Manual Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnIncome]}
            onPress={() => openAddModal('income')}
            activeOpacity={0.8}
          >
            <View style={[styles.btnIconWrap, { backgroundColor: 'rgba(46, 204, 143, 0.2)' }]}>
              <PlusIcon size={16} color={colors.income} />
            </View>
            <Text style={styles.actionBtnText}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <Text style={styles.sectionSub}>{recentTransactions.length} items</Text>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍃</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the big mic below or "Voice Add" to speak your first expense.
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
                  <Text style={styles.txEmoji}>{tx.category_emoji || '✨'}</Text>
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txNote} numberOfLines={1}>
                    {tx.note}
                  </Text>
                  <Text style={styles.txCategory}>
                    {tx.category_name || 'General'} • {tx.occurred_on}
                    {tx.source === 'voice' && ' • 🎤'}
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
                    onPress={() => deleteTransaction(tx.id)}
                    hitSlop={8}
                    style={styles.deleteIcon}
                  >
                    <TrashIcon size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Docked Centered Big Mic Button */}
      <View style={styles.dockedMicContainer}>
        <TouchableOpacity
          style={styles.dockedMicButton}
          onPress={() => setVoiceSheetVisible(true)}
          activeOpacity={0.85}
        >
          <MicIcon size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Undo Snackbar */}
      {lastDeletedTransaction && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Entry deleted</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Voice & Typed Input Sheet */}
      <VoiceSheet
        visible={voiceSheetVisible}
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
    </SafeAreaView>
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
    paddingBottom: 100, // accommodate docked mic
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletContainer: {
    position: 'relative',
    height: 200,
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
    backgroundColor: '#0d162d',
    borderColor: 'rgba(46, 204, 143, 0.2)',
    borderWidth: 1,
    height: 80,
  },
  peekCardMiddle: {
    top: 14,
    backgroundColor: '#121d3a',
    borderColor: colors.border,
    borderWidth: 1,
    height: 80,
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
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tag: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  balanceText: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '700',
    fontFamily: typography.displaySerif,
    marginVertical: spacing.sm,
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
    fontWeight: '600',
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
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  actionBtnManual: {
    backgroundColor: colors.surface,
  },
  actionBtnIncome: {
    backgroundColor: colors.surface,
  },
  btnIconWrap: {
    width: 26,
    height: 26,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 13,
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
  sectionSub: {
    color: colors.muted,
    fontSize: 12,
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
    padding: spacing.lg,
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
    padding: 2,
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
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  snackbarText: {
    color: colors.text,
    fontSize: 14,
  },
  undoText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 14,
  },
});
