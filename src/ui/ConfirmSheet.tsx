/**
 * Verification bottom sheet for parsed voice/typed inputs before saving.
 * Where it fits: Appears right after `parseUtterance` processes speech or text.
 *
 * Beginner note: "Human-in-the-loop" AI design: Voice recognition is never 100% perfect
 * (background noise, accents). Rather than silently saving an incorrect guess, Wini
 * always displays this sheet so you can confirm or edit the entry with one tap.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from './tokens';
import { Category, TransactionType } from '../domain/types';
import { ParseResult } from '../parser';
import { formatRupees } from '../domain/money';
import { formatDisplayDate } from '../domain/dates';

interface ConfirmSheetProps {
  visible: boolean;
  parsed: ParseResult | null;
  rawTranscript: string;
  source: 'voice' | 'typed';
  categories: Category[];
  onSave: (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
    source: 'voice' | 'typed';
    rawText: string;
    learnedWord?: string;
    corrected?: boolean;
  }) => Promise<void>;
  onEdit: (data: {
    type: TransactionType;
    amountPaise: number;
    categoryId: string;
    note: string;
    occurredOn: string;
    source: 'voice' | 'typed';
    rawText: string;
  }) => void;
  onClose: () => void;
}

export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  visible,
  parsed,
  rawTranscript,
  source,
  categories,
  onSave,
  onEdit,
  onClose,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userSelectedCategoryId, setUserSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryTarget, setSelectedCategoryTarget] = useState<string | null>(null);

  const currentKey = `${parsed?.amountPaise}_${parsed?.category}_${parsed?.note}`;

  const computedDefaultCategoryId = React.useMemo(() => {
    if (!parsed) return '';
    if (parsed.category) {
      const found = categories.find(
        (c) => c.name.toLowerCase() === parsed.category?.toLowerCase()
      );
      if (found) return found.id;
    }
    const defaultCat = categories.find((c) => c.kind === parsed.type);
    return defaultCat?.id || categories[0]?.id || '';
  }, [parsed, categories]);

  const selectedCategoryId =
    selectedCategoryTarget === currentKey && userSelectedCategoryId
      ? userSelectedCategoryId
      : computedDefaultCategoryId;

  const setSelectedCategoryId = (id: string) => {
    setUserSelectedCategoryId(id);
    setSelectedCategoryTarget(currentKey);
  };

  const originalCategoryName = parsed?.category || null;

  if (!parsed || !parsed.amountPaise) {
    return null;
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleSave = async () => {
    if (!parsed.amountPaise || !selectedCategoryId) return;

    try {
      setIsSaving(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics fallback on web/unsupported
      }

      // If category was unknown or user changed category, determine word to learn
      let learnedWord: string | undefined = undefined;
      const isCorrected = Boolean(
        !originalCategoryName ||
          originalCategoryName.toLowerCase() !== selectedCategory?.name?.toLowerCase()
      );

      if (isCorrected) {
        // Use the note or matched keyword as learned word
        learnedWord = (parsed.matchedKeyword || parsed.note || '').trim().toLowerCase();
      }

      await onSave({
        type: parsed.type,
        amountPaise: parsed.amountPaise,
        categoryId: selectedCategoryId,
        note: parsed.note,
        occurredOn: parsed.date,
        source,
        rawText: rawTranscript,
        learnedWord,
        corrected: isCorrected,
      });

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    if (!parsed.amountPaise) return;
    onEdit({
      type: parsed.type,
      amountPaise: parsed.amountPaise,
      categoryId: selectedCategoryId,
      note: parsed.note,
      occurredOn: parsed.date,
      source,
      rawText: rawTranscript,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Confirm Transaction</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Raw transcript badge */}
          {rawTranscript ? (
            <View style={styles.heardBox}>
              <Text style={styles.heardLabel}>Heard: </Text>
              <Text style={styles.heardText} numberOfLines={2}>
                {`"${rawTranscript}"`}
              </Text>
            </View>
          ) : null}

          {/* Amount Display */}
          <View style={styles.amountWrap}>
            <Text
              style={[
                styles.amountValue,
                parsed.type === 'income' ? styles.amountIncome : styles.amountExpense,
              ]}
            >
              {parsed.type === 'income' ? '+' : '-'}
              {formatRupees(parsed.amountPaise)}
            </Text>
            <View
              style={[
                styles.typeBadge,
                parsed.type === 'income' ? styles.typeBadgeIncome : styles.typeBadgeExpense,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  parsed.type === 'income' ? styles.typeBadgeTextIncome : styles.typeBadgeTextExpense,
                ]}
              >
                {parsed.type === 'income' ? 'Income' : 'Expense'}
              </Text>
            </View>
          </View>

          {/* Transaction Summary Card */}
          <View style={styles.summaryCard}>
            {/* Category row */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory?.color ? { borderColor: selectedCategory.color } : null,
                ]}
                onPress={() => setIsPickerOpen(!isPickerOpen)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryEmoji}>
                  {selectedCategory?.emoji || '✨'}
                </Text>
                <Text style={styles.categoryName}>
                  {selectedCategory?.name || 'Select Category'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Note row */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Note</Text>
              <Text style={styles.summaryValue}>{parsed.note || 'None'}</Text>
            </View>

            {/* Date row */}
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {formatDisplayDate(parsed.date)} ({parsed.date})
              </Text>
            </View>
          </View>

          {/* Category Picker Dropdown (when tapped) */}
          {isPickerOpen && (
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>Choose Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {categories
                  .filter((c) => c.kind === parsed.type)
                  .map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catPickChip,
                          isSelected && styles.catPickChipActive,
                        ]}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          setIsPickerOpen(false);
                        }}
                      >
                        <Text style={styles.catPickEmoji}>{cat.emoji}</Text>
                        <Text style={styles.catPickText}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={handleEdit}
              disabled={isSaving}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
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
  heardBox: {
    flexDirection: 'row',
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  heardText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  amountWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '800',
    fontFamily: typography.displaySerif,
  },
  amountExpense: {
    color: colors.text,
  },
  amountIncome: {
    color: colors.income,
  },
  typeBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  typeBadgeExpense: {
    backgroundColor: colors.expenseMuted,
  },
  typeBadgeIncome: {
    backgroundColor: colors.incomeMuted,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadgeTextExpense: {
    color: colors.expense,
  },
  typeBadgeTextIncome: {
    color: colors.income,
  },
  summaryCard: {
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  dropdownArrow: {
    color: colors.muted,
    fontSize: 9,
  },
  pickerBox: {
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickerTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  pickerScroll: {
    flexDirection: 'row',
  },
  catPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  catPickEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  catPickText: {
    color: colors.text,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  editBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  editBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '700',
  },
});
