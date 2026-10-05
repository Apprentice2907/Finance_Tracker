import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface SegmentOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  selectedKey: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedKey,
  onChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isSelected = opt.key === selectedKey;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minHeight: 40,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    color: colors.muted,
  },
  labelSelected: {
    fontFamily: typography.bodySemiBold,
    color: colors.white,
  },
});
