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
import { colors, radii, spacing, typography } from '../tokens';

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
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  const containerStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  const loaderColor =
    variant === 'primary' || variant === 'danger'
      ? colors.white
      : colors.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
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
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
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

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.elevatedBorder,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.danger,
  },

  // Sizes (Touch target guideline: min 48px height on standard buttons)
  size_sm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  size_md: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  size_lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },

  // Text base
  textBase: {
    fontFamily: typography.bodySemiBold,
    textAlign: 'center',
  },
  text_primary: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.text,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.white,
  },
  textDisabled: {
    color: colors.muted,
  },

  textSize_sm: {
    fontSize: typography.sizeSm,
  },
  textSize_md: {
    fontSize: typography.sizeBase,
  },
  textSize_lg: {
    fontSize: typography.sizeLg,
  },
});
