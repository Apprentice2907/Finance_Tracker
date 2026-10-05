import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface ChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  emoji,
  selected = false,
  onPress,
  color,
  style,
  disabled = false,
}) => {
  const customBg = color ? `${color}20` : undefined;
  const customBorder = color ? color : undefined;

  const content = (
    <View style={styles.row}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text
        style={[
          styles.label,
          selected && styles.labelSelected,
          color && { color },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const containerStyle = [
    styles.container,
    selected && styles.containerSelected,
    customBg && { backgroundColor: customBg },
    customBorder && { borderColor: customBorder },
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={containerStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  containerSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: typography.sizeSm,
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: typography.bodySemiBold,
  },
});
