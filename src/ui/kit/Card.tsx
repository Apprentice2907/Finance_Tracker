/**
 * Card component for Wini.
 * Where it fits: Used for containers, widgets, summaries, and list items.
 *
 * Implements WINI_DESIGN_SPEC.md Section 3 & 5.1:
 * - Night: Near-black surface (#151517), hairline border, no drop shadows
 * - Pocket: White surface (#FFFFFF), subtle border, soft clean shadow
 * - Radius 24 (card standard)
 */

import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { radii, spacing, elevations } from '../tokens';
import { useTheme } from '../ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'elevated' | 'glass' | 'outlined';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing | number;
  borderRadius?: number;
  elevation?: keyof typeof elevations;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  onPress,
  style,
  padding = 'lg',
  borderRadius = radii.card,
  elevation = 'none',
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  let backgroundColor = colors.surface;
  let borderColor = colors.border;
  let borderWidth = 1;

  if (variant === 'elevated') {
    backgroundColor = colors.surface2;
    borderColor = colors.border;
  } else if (variant === 'glass') {
    backgroundColor = colors.glassFill;
    borderColor = colors.glassBorder;
  } else if (variant === 'outlined') {
    backgroundColor = colors.transparent;
    borderColor = colors.border;
  }

  // Pocket uses soft elevations on cards; Night relies on surface tone steps
  const shadowStyle = !isDark && elevation === 'none' && variant === 'surface'
    ? elevations.sm
    : elevations[elevation];

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
    padding: padValue,
    ...shadowStyle,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={disabled}
        style={[styles.base, cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
