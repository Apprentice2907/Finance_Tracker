import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radii, spacing, elevations } from '../tokens';

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
  borderRadius = radii.lg,
  elevation = 'none',
  disabled = false,
}) => {
  const padValue = typeof padding === 'number' ? padding : spacing[padding];
  const cardStyle: ViewStyle = {
    padding: padValue,
    borderRadius,
    ...elevations[elevation],
  };

  const variantStyle = styles[variant] || styles.surface;

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={disabled}
        style={[styles.base, variantStyle, cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, variantStyle, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.elevatedBorder,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  outlined: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
