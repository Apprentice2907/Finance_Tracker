/**
 * PillSelector component for Wini.
 * Where it fits: Used for dropdowns and period selectors across cards (Hero month picker, Bar chart period dropdown, Donut month filter).
 *
 * Implements WINI_DESIGN_DECISIONS.md Sections 1.2, 1.3, 1.5:
 * - Variants: 'white' (solid white, black text), 'glass' (dark glass with hairline border), 'surface2' (dark surface2)
 * - Rounded pill (radius 999), 36px height, compact padding, chevron dropdown indicator
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';

export interface PillSelectorProps {
  label: string;
  variant?: 'white' | 'glass' | 'surface2';
  icon?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const PillSelector: React.FC<PillSelectorProps> = ({
  label,
  variant = 'surface2',
  icon,
  showChevron = true,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const isWhite = variant === 'white';
  const isGlass = variant === 'glass';

  const bg = isWhite ? colors.white : isGlass ? colors.glassFill : colors.surface2;
  const borderColor = isWhite ? 'transparent' : isGlass ? colors.glassBorder : colors.border;
  const textColor = isWhite ? colors.black : colors.white;
  const chevronColor = isWhite ? colors.black : colors.textMuted;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: isWhite ? 0 : 1,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
      {showChevron ? (
        <Ionicons
          name="chevron-down"
          size={14}
          color={chevronColor}
          style={styles.chevron}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
