/**
 * HeroCard component for Wini.
 * Where it fits: Top hero card on the Home screen.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.5:
 * - TexturedCard with cosmos-silk.jpg, radius 28, ~210px tall
 * - Soft dark scrim over the bottom 40% for optimal readability
 * - Top-left: White PillSelector ("October 2026 ⌄")
 * - Top-right: Glass circle button with eye icon (hide/show amounts)
 * - Middle: "Net cashflow" (14px, 80% white) + big net amount (44-52px, regular weight, dimmed decimals; '••••••' when hidden)
 * - Bottom row: Two GlassChips side by side for Income and Expense
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';
import { TexturedCard } from './TexturedCard';
import { PillSelector } from './PillSelector';
import { GlassChip } from './GlassChip';
import { AmountText } from './AmountText';

export interface HeroCardProps {
  monthLabel: string;
  onMonthPress?: () => void;
  netCashflowPaise: number;
  incomePaise: number;
  expensePaise: number;
  hideAmounts?: boolean;
  onToggleHideAmounts?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  monthLabel,
  onMonthPress,
  netCashflowPaise,
  incomePaise,
  expensePaise,
  hideAmounts = false,
  onToggleHideAmounts,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TexturedCard
      texture="cosmos-silk"
      borderRadius={28}
      style={[styles.card, style]}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <PillSelector
          label={monthLabel}
          variant="white"
          onPress={onMonthPress}
        />

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onToggleHideAmounts}
          style={[
            styles.eyeButton,
            {
              backgroundColor: colors.glassFill,
              borderColor: colors.glassBorder,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
        >
          <Ionicons
            name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Middle Net cashflow */}
      <View style={styles.middleSection}>
        <Text style={styles.netLabel}>Net cashflow</Text>
        {hideAmounts ? (
          <Text style={[styles.hiddenText, { color: colors.white }]}>••••••</Text>
        ) : (

          <AmountText
            amountPaise={netCashflowPaise}
            size="hero"
            showSign={false}
            style={[styles.heroAmount, { color: colors.white }]}
          />

        )}
      </View>

      {/* Bottom row: Income and Expense glass chips */}
      <View style={styles.bottomRow}>
        <GlassChip
          label="Income"
          amountPaise={incomePaise}
          type="income"
          hideAmount={hideAmounts}
        />
        <View style={{ width: spacing.md }} />
        <GlassChip
          label="Expense"
          amountPaise={expensePaise}
          type="expense"
          hideAmount={hideAmounts}
        />
      </View>
    </TexturedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 210,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleSection: {
    marginVertical: spacing.md,
    zIndex: 2,
  },
  netLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeBody,
    color: 'rgba(255, 255, 255, 0.80)',
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: typography.sizeHeroSm,
    lineHeight: 52,
  },
  hiddenText: {
    fontFamily: typography.bodyBold,
    fontSize: 36,
    letterSpacing: 4,
    lineHeight: 52,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
});
