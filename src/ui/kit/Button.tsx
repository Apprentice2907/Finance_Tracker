/**
 * Button component for Wini.
 * Where it fits: Used for primary calls to action, secondary glass actions, and danger buttons.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.2:
 * - Primary: Accent fill (lime #F2F96E in Night with #0B0B0D text; blue #2B5BE8 in Pocket with #FFFFFF text)
 * - Secondary: Glass fill with hairline border (1px)
 * - Ghost: Flat text-only action
 * - Danger: Destructive action
 * - Sizes: sm (36px), md (48px - touch friendly), lg (56px)
 * - Loading and disabled states
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  pill = true,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;

  let backgroundColor = colors.transparent;
  let borderColor = colors.transparent;
  let textColor = colors.text;
  let borderWidth = 0;

  if (variant === 'primary') {
    backgroundColor = colors.accent;
    textColor = colors.onAccent;
  } else if (variant === 'secondary') {
    backgroundColor = colors.glassFill;
    borderColor = colors.glassBorder;
    borderWidth = 1;
    textColor = isDark ? colors.white : colors.text;
  } else if (variant === 'ghost') {
    backgroundColor = colors.transparent;
    textColor = colors.accent;
  } else if (variant === 'danger') {
    backgroundColor = colors.dangerMuted;
    borderColor = colors.danger;
    borderWidth = 1;
    textColor = colors.danger;
  }

  const borderRadius = pill ? radii.round : radii.xl;

  const heightByDim = {
    sm: 36,
    md: 48,
    lg: 56,
  };

  const padHorizontal = {
    sm: spacing.md,
    md: spacing.xl,
    lg: spacing.xxl,
  };

  const fontSizes = {
    sm: typography.sizeSm,
    md: typography.sizeLabel,
    lg: typography.sizeBase,
  };

  const containerStyles: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      height: heightByDim[size],
      paddingHorizontal: padHorizontal[size],
    },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles: StyleProp<TextStyle> = [
    styles.textBase,
    {
      color: textColor,
      fontSize: fontSizes[size],
    },
    isDisabled && { color: colors.textMuted },
    textStyle,
  ];

  const loaderColor = variant === 'primary' ? colors.onAccent : colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyles}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={loaderColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  textBase: {
    fontFamily: typography.bodySemiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
});
