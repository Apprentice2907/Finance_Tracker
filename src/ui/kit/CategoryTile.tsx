/**
 * CategoryTile component for Wini.
 * Where it fits: Used on Reports, Analytics, and Category breakdowns in a 2-column grid.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.6 & Dark set C:
 * - Rounded tile (radius 20)
 * - Category squircle icon, category name, formatted amount (AmountText)
 * - Optional transaction count or share percentage
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { AmountText } from './AmountText';

export interface CategoryTileProps {
  name: string;
  amountPaise: number;
  color?: string;
  emoji?: string;
  iconName?: string;
  count?: number;
  percentage?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({
  name,
  amountPaise,
  color,
  emoji,
  iconName,
  count,
  percentage,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface2,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <CategoryIcon name={iconName || name} color={color} emoji={emoji} size="md" />
        {percentage !== undefined ? (
          <View style={[styles.badge, { backgroundColor: colors.glassFill }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>{percentage}%</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <AmountText amountPaise={amountPaise} size="md" style={styles.amount} />
        {count !== undefined ? (
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {count} {count === 1 ? 'transaction' : 'transactions'}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.tile,
    padding: spacing.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  badgeText: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeXs,
  },
  content: {
    marginTop: spacing.xs,
  },
  name: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    marginBottom: spacing.xs,
  },
  amount: {
    fontFamily: typography.bodyBold,
  },
  countText: {
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginTop: spacing.xs,
  },
});
