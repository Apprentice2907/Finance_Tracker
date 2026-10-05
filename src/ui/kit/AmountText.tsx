import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { colors, typography } from '../tokens';
import { formatRupees } from '../../domain/money';

export type AmountSize = 'sm' | 'md' | 'lg' | 'xl' | 'display' | 'hero';
export type AmountType = 'income' | 'expense' | 'neutral';

export interface AmountTextProps {
  amountPaise: number;
  type?: AmountType;
  size?: AmountSize;
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
  fontFamily?: string;
}

export const AmountText: React.FC<AmountTextProps> = ({
  amountPaise,
  type = 'neutral',
  size = 'md',
  showSign = false,
  style,
  fontFamily,
}) => {
  const formatted = formatRupees(Math.abs(amountPaise));
  let sign = '';
  if (showSign) {
    if (type === 'income' || amountPaise > 0) sign = '+';
    else if (type === 'expense' || amountPaise < 0) sign = '−';
  }

  const colorStyle =
    type === 'income'
      ? styles.income
      : type === 'expense'
      ? styles.expense
      : styles.neutral;

  const sizeStyle = styles[`size_${size}`];

  return (
    <Text
      style={[
        styles.base,
        colorStyle,
        sizeStyle,
        fontFamily ? { fontFamily } : null,
        style,
      ]}
    >
      {sign}
      {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.bodyBold,
  },
  income: {
    color: colors.income,
  },
  expense: {
    color: colors.expense,
  },
  neutral: {
    color: colors.text,
  },

  size_sm: {
    fontSize: typography.sizeSm,
  },
  size_md: {
    fontSize: typography.sizeBase,
  },
  size_lg: {
    fontSize: typography.sizeLg,
  },
  size_xl: {
    fontSize: typography.sizeXl,
  },
  size_display: {
    fontSize: typography.sizeDisplay,
    fontFamily: typography.displaySerif,
  },
  size_hero: {
    fontSize: typography.sizeHero,
    fontFamily: typography.displaySerif,
  },
});
