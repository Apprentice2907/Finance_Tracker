/**
 * AmountText component for Wini.
 * Where it fits: Used for numbers, balances, transactions, and metrics across all screens.
 *
 * Implements WINI_DESIGN_SPEC.md Section 3.4 & 5.5:
 * - Indian number grouping (e.g. ₹1,23,456)
 * - Dimmed decimal part (e.g. .50 is smaller & muted)
 * - Sign colouring: income (green), expense (red), neutral (text)
 * - Pocket theme: Elegant serif numerals (DM Serif Display) on big numbers
 * - Night theme: Crisp modern sans (Inter light/regular)
 */

import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp, View } from 'react-native';
import { typography } from '../tokens';
import { formatRupees } from '../../domain/money';
import { useTheme } from '../ThemeContext';

export type AmountSize = 'sm' | 'md' | 'lg' | 'xl' | 'display' | 'hero';
export type AmountType = 'income' | 'expense' | 'neutral';

export interface AmountTextProps {
  amountPaise: number;
  type?: AmountType;
  size?: AmountSize;
  showSign?: boolean;
  dimDecimals?: boolean;
  style?: StyleProp<TextStyle>;
  fontFamily?: string;
}

export const AmountText: React.FC<AmountTextProps> = ({
  amountPaise,
  type = 'neutral',
  size = 'md',
  showSign = false,
  dimDecimals = true,
  style,
  fontFamily,
}) => {
  const { colors, activeTheme } = useTheme();

  const formatted = formatRupees(Math.abs(amountPaise));
  let sign = '';
  if (showSign) {
    if (type === 'income' || amountPaise > 0) sign = '+';
    else if (type === 'expense' || amountPaise < 0) sign = '−';
  }

  // Determine active color
  let mainColor = colors.text;
  if (type === 'income') mainColor = colors.income;
  else if (type === 'expense') mainColor = colors.expense;

  // Typography selection: Pocket prefers serif on large numerals
  const isPocket = activeTheme === 'pocket';
  let defaultFont = typography.bodyBold;

  if (size === 'display' || size === 'hero') {
    defaultFont = isPocket ? typography.displaySerif : typography.bodyLight;
  } else if (size === 'xl' && isPocket) {
    defaultFont = typography.displaySerif;
  }

  const chosenFont = fontFamily || defaultFont;

  const fontSizes = {
    sm: typography.sizeSm,
    md: typography.sizeBase,
    lg: typography.sizeLg,
    xl: typography.sizeXl,
    display: typography.sizeDisplay,
    hero: typography.sizeHero,
  };

  const currentFontSize = fontSizes[size];
  const decimalFontSize = Math.max(11, Math.round(currentFontSize * 0.65));

  // Split formatted into main and decimal
  const parts = formatted.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? `.${parts[1]}` : '';

  return (
    <Text
      style={[
        styles.base,
        {
          color: mainColor,
          fontSize: currentFontSize,
          fontFamily: chosenFont,
        },
        style,
      ]}
    >
      {sign}
      {intPart}
      {decPart && dimDecimals ? (
        <Text
          style={[
            styles.decimalText,
            {
              color: colors.textMuted,
              fontSize: decimalFontSize,
              fontFamily: typography.bodyMedium,
            },
          ]}
        >
          {decPart}
        </Text>
      ) : (
        decPart
      )}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
  decimalText: {
    fontWeight: '400',
  },
});
