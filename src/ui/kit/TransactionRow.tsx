/**
 * TransactionRow component for Wini.
 * Where it fits: Used for Recent Transactions, History list, and Passbook rows.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.7 & Dark set A:
 * - Category squircle icon on left
 * - Title (note or category name), subtitle (category & account)
 * - Amount on right with sign and color, date/time below
 * - Smooth touch feedback
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { AmountText } from './AmountText';

export interface TransactionRowProps {
  title: string;
  subtitle?: string;
  amountPaise: number;
  type: 'income' | 'expense';
  dateStr?: string;
  categoryColor?: string;
  categoryEmoji?: string;
  categoryName?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  title,
  subtitle,
  amountPaise,
  type,
  dateStr,
  categoryColor,
  categoryEmoji,
  categoryName,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, style]}
    >
      <CategoryIcon
        name={categoryName || 'other'}
        color={categoryColor}
        emoji={categoryEmoji}
        size="md"
      />

      <View style={styles.centerCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightCol}>
        <AmountText
          amountPaise={amountPaise}
          type={type}
          showSign
          size="md"
          style={styles.amount}
        />
        {dateStr ? (
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  centerCol: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeBase,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: typography.bodyBold,
  },
  dateText: {
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginTop: 2,
  },
});
