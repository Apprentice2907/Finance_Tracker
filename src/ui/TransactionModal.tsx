import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radii, spacing } from './tokens';
import { Category, TransactionWithCategory, TransactionType } from '../domain/types';
import { rupeesToPaise, paiseToRupees } from '../domain/money';
import { getTodayIndia, getRelativeDateIndia } from '../domain/dates';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
  }) => Promise<void>;
  categories: Category[];
  initialTransaction?: TransactionWithCategory | null;
  defaultType?: TransactionType;
}

const TransactionModalForm: React.FC<Omit<TransactionModalProps, 'visible'>> = ({
  onClose,
  onSave,
  categories,
  initialTransaction,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<TransactionType>(
    initialTransaction ? initialTransaction.type : defaultType
  );
  const [amountStr, setAmountStr] = useState(
    initialTransaction ? String(paiseToRupees(initialTransaction.amount_paise)) : ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    if (initialTransaction) return initialTransaction.category_id;
    const defaultCat = categories.find((c) => c.kind === defaultType);
    return defaultCat?.id || (categories[0]?.id ?? '');
  });
  const [note, setNote] = useState(initialTransaction ? initialTransaction.note : '');
  const [dateStr, setDateStr] = useState(
    initialTransaction ? initialTransaction.occurred_on : getTodayIndia()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.kind === type);

  const handleSave = async () => {
    const paise = rupeesToPaise(amountStr);
    if (!paise || paise <= 0) {
      setValidationError('Please enter a valid amount greater than 0');
      return;
    }
    if (!selectedCategoryId) {
      setValidationError('Please select a category');
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError(null);
      await onSave({
        type,
        amountPaise: paise,
        categoryId: selectedCategoryId,
        note: note.trim() || (type === 'expense' ? 'Expense' : 'Income'),
        occurredOn: dateStr,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.sheet}>
      {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {initialTransaction ? 'Edit Entry' : 'Add Entry'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Type Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'expense' && styles.typeTabActiveExpense,
                ]}
                onPress={() => {
                  setType('expense');
                  const cat = categories.find((c) => c.kind === 'expense');
                  if (cat) setSelectedCategoryId(cat.id);
                }}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'expense' && styles.typeTabTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'income' && styles.typeTabActiveIncome,
                ]}
                onPress={() => {
                  setType('income');
                  const cat = categories.find((c) => c.kind === 'income');
                  if (cat) setSelectedCategoryId(cat.id);
                }}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'income' && styles.typeTabTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus={!initialTransaction}
              />
            </View>

            {/* Categories */}
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {filteredCategories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                      isSelected && { borderColor: cat.color },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && { color: colors.text, fontWeight: '700' },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Note Input */}
            <Text style={styles.sectionLabel}>Note / Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Chai, Auto, Groceries"
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
            />

            {/* Date Quick Selector */}
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.dateRow}>
              {[
                { label: 'Today', value: getTodayIndia() },
                { label: 'Yesterday', value: getRelativeDateIndia(-1) },
                { label: '2 days ago', value: getRelativeDateIndia(-2) },
              ].map((d) => (
                <TouchableOpacity
                  key={d.label}
                  style={[
                    styles.dateChip,
                    dateStr === d.value && styles.dateChipSelected,
                  ]}
                  onPress={() => setDateStr(d.value)}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      dateStr === d.value && styles.dateChipTextSelected,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {validationError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Text style={styles.saveBtnText}>
                  {isSubmitting ? 'Saving...' : initialTransaction ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
  );
};

export const TransactionModal: React.FC<TransactionModalProps> = (props) => {
  if (!props.visible) return null;

  const formKey = props.initialTransaction?.id || `new_${props.defaultType || 'expense'}`;

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TransactionModalForm key={formKey} {...props} />
      </KeyboardAvoidingView>
    </Modal>
  );
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    color: colors.muted,
    fontSize: 20,
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    padding: 4,
    marginVertical: spacing.md,
  },
  typeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
  },
  typeTabActiveExpense: {
    backgroundColor: colors.expense,
  },
  typeTabActiveIncome: {
    backgroundColor: colors.income,
  },
  typeTabText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 14,
  },
  typeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  currencyPrefix: {
    color: colors.textSecondary,
    fontSize: 36,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  amountInput: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryName: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  textInput: {
    backgroundColor: colors.elevated,
    color: colors.text,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderRadius: radii.round,
  },
  dateChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dateChipText: {
    color: colors.muted,
    fontSize: 13,
  },
  dateChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 122, 0.15)',
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.expense,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
