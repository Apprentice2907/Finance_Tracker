/**
 * Transaction History screen for Wini.
 * Where it fits: Accessible via the "History" tab in the bottom bar (`/history`).
 *
 * Beginner note: This screen groups transactions by day ("Today", "Yesterday") and computes
 * daily subtotals. It also demonstrates client-side filtering: as you type in the search box
 * or tap category filter chips, the list updates instantly without re-querying SQLite!
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { formatRupees } from '../src/domain/money';
import { TransactionWithCategory, TransactionType } from '../src/domain/types';
import { SearchIcon, TrashIcon } from '../src/ui/icons';
import { TransactionModal } from '../src/ui/TransactionModal';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { Screen, CategoryIcon } from '../src/ui/kit';
import { formatRelativeDate } from '../src/utils/microcopy';

function HistoryContent() {
  const {
    groupedTransactions,
    categories,
    updateTransaction,
    deleteTransaction,
    undoDelete,
    lastDeletedTransaction,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const onBack = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [modalVisible]);

  // Filter groups
  const filteredGroups = groupedTransactions
    .map((group) => {
      const filteredTxs = group.transactions.filter((tx) => {
        // Type filter
        if (selectedType !== 'all' && tx.type !== selectedType) {
          return false;
        }
        // Category filter
        if (selectedCategoryId && tx.category_id !== selectedCategoryId) {
          return false;
        }
        // Search filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.trim().toLowerCase();
          const matchNote = tx.note.toLowerCase().includes(q);
          const matchCat = (tx.category_name || '').toLowerCase().includes(q);
          const matchAmount = String(tx.amount_paise / 100).includes(q);
          return matchNote || matchCat || matchAmount;
        }
        return true;
      });

      const dayExpense = filteredTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount_paise, 0);

      return {
        ...group,
        transactions: filteredTxs,
        filteredExpense: dayExpense,
      };
    })
    .filter((group) => group.transactions.length > 0);

  const openEditModal = (tx: TransactionWithCategory) => {
    setEditingTransaction(tx);
    setModalVisible(true);
  };

  const handleUpdate = async (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
  }) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        type: data.type,
        amount_paise: data.amountPaise,
        category_id: data.categoryId,
        note: data.note,
        occurred_on: data.occurredOn,
      });
    }
  };

  return (
    <Screen scrollable={false} hasTabBar={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>All transactions grouped by day</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchIcon size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, categories, amounts..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typePill,
                selectedType === t && styles.typePillActive,
              ]}
              onPress={() => setSelectedType(t)}
            >
              <Text
                style={[
                  styles.typePillText,
                  selectedType === t && styles.typePillTextActive,
                ]}
              >
                {t === 'all' ? 'All Types' : t === 'expense' ? 'Expenses' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterScroll}
          contentContainerStyle={styles.categoryFilterContainer}
        >
          <TouchableOpacity
            style={[
              styles.catChip,
              selectedCategoryId === null && styles.catChipActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text
              style={[
                styles.catChipText,
                selectedCategoryId === null && styles.catChipTextActive,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text
                  style={[styles.catChipText, isSelected && styles.catChipTextActive]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grouped Day List */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredGroups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={40} color={colors.muted} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or filters.
              </Text>
            </View>
          ) : (
            filteredGroups.map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayDate}>{formatRelativeDate(group.date)}</Text>
                  {group.filteredExpense > 0 && (
                    <Text style={styles.dayTotal}>
                      Spent: {formatRupees(group.filteredExpense)}
                    </Text>
                  )}
                </View>

                <View style={styles.dayCard}>
                  {group.transactions.map((tx, idx) => (
                    <TouchableOpacity
                      key={tx.id}
                      style={[
                        styles.txRow,
                        idx === group.transactions.length - 1 && styles.txRowLast,
                      ]}
                      onPress={() => openEditModal(tx)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.txEmojiBox,
                          {
                            backgroundColor: tx.category_color
                              ? `${tx.category_color}22`
                              : colors.elevated,
                          },
                        ]}
                      >
                        <CategoryIcon name={tx.category_icon} color={tx.category_color} size={20} variant="plain" />
                      </View>

                      <View style={styles.txDetails}>
                        <Text style={styles.txNote} numberOfLines={1}>
                          {tx.note}
                        </Text>
                        <Text style={styles.txCategory}>
                          {tx.category_name || 'General'}
                          {tx.source === 'voice' && ' • Voice'}
                        </Text>
                      </View>

                      <View style={styles.txRight}>
                        <Text
                          style={[
                            styles.txAmount,
                            tx.type === 'income'
                              ? styles.txAmountIncome
                              : styles.txAmountExpense,
                          ]}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatRupees(tx.amount_paise)}
                        </Text>

                        <TouchableOpacity
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                            deleteTransaction(tx.id);
                          }}
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
              </View>
            ))
          )}
        </ScrollView>

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

        {/* Edit Modal */}
        <TransactionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleUpdate}
          categories={categories}
          initialTransaction={editingTransaction}
        />
      </View>
    </Screen>
  );
}

export default function HistoryScreen() {
  return (
    <ErrorBoundary fallbackTitle="History unavailable">
      <HistoryContent />
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
    paddingTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  clearSearch: {
    color: colors.muted,
    fontSize: 14,
    padding: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typePill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  categoryFilterScroll: {
    maxHeight: 38,
    marginBottom: spacing.md,
  },
  categoryFilterContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  catEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  catChipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  catChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  dayGroup: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayDate: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  dayTotal: {
    color: colors.muted,
    fontSize: 12,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txRowLast: {
    borderBottomWidth: 0,
  },
  txEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txEmoji: {
    fontSize: 20,
  },
  txDetails: {
    flex: 1,
  },
  txNote: {
    color: colors.text,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
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
    marginTop: spacing.xl,
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
  },
  snackbar: {
    position: 'absolute',
    bottom: 20,
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
    elevation: 8,
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
