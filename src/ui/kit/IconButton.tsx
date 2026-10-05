import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radii } from '../tokens';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  variant?: 'default' | 'surface' | 'glass' | 'primary' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 48,
  variant = 'default',
  disabled = false,
  accessibilityLabel,
  style,
}) => {
  const customDimensions: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radii.round,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        styles[variant],
        customDimensions,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.transparent,
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.4,
  },
});
