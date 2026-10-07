/**
 * GlassChip component for Wini.
 * Where it fits: Used on HeroCard and summary cards for glassmorphic KPI pills (Income, Expense, etc.).
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.5:
 * - Glass fill (glassFill) with 1px glassBorder
 * - Icon (up-right for Income, down-right for Expense)
 * - Label (12px textMuted / white 80%) + Amount (18px semibold white)
 */

import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';
import { formatRupees } from '../../domain/money';

export interface GlassChipProps {
  label: string;
  amountPaise?: number;
  valueText?: string;
  type?: 'income' | 'expense' | 'neutral';
  icon?: React.ReactNode;
  hideAmount?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  label,
  amountPaise,
  valueText,
  type = 'neutral',
  icon,
  hideAmount = false,
  style,
}) => {
  const { colors } = useTheme();

  const formattedAmount = hideAmount
    ? '••••'
    : valueText !== undefined
      ? valueText
      : amountPaise !== undefined
        ? formatRupees(amountPaise)
        : '₹0';

  const defaultIcon =
    type === 'income' ? (
      <Ionicons name="arrow-up-outline" size={14} color={colors.income} style={{ transform: [{ rotate: '45deg' }] }} />
    ) : type === 'expense' ? (
      <Ionicons name="arrow-down-outline" size={14} color={colors.expense} style={{ transform: [{ rotate: '-45deg' }] }} />
    ) : null;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.glassFill,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          {icon || defaultIcon}
        </View>
        <Text style={[styles.label, { color: 'rgba(255, 255, 255, 0.75)' }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.white }]} numberOfLines={1}>
        {formattedAmount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeCaption,
  },
  amount: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeLg,
    fontWeight: '600',
  },
});
