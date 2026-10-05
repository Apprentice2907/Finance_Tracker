/**
 * GlassButton tile component for Wini.
 * Where it fits: Used in rows of 4 on the Hero card (Speak, Type, Income, More)
 * and quick-action toolbars.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.3 & Dark set B:
 * - Vertical tile: Icon above label
 * - Frosted glass fill with hairline 1px border
 * - Touch feedback
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';

export interface GlassButtonProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  label,
  icon,
  onPress,
  style,
  disabled = false,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.tile,
        {
          backgroundColor: colors.glassFill,
          borderColor: colors.glassBorder,
        },
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    minHeight: 72,
  },
  iconWrap: {
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
