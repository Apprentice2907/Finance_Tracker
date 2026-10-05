/**
 * SegmentedControl component for Wini.
 * Where it fits: Used for Speak | Type, Expense | Income, and period selection.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.4:
 * - Pill track: rounded container with surface tone
 * - Active segment: Filled pill (white on Night with #0B0B0D text; white with shadow on Pocket)
 * - Inactive segment: Muted text
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { radii, spacing, typography, elevations } from '../tokens';
import { useTheme } from '../ThemeContext';

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
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface2,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isSelected = opt.key === selectedKey;
        const activeBg = colors.white;
        const activeText = colors.black;
        const activeShadow = isDark ? null : elevations.sm;

        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              isSelected && {
                backgroundColor: activeBg,
                ...activeShadow,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text
              style={[
                styles.label,
                { color: isSelected ? activeText : colors.textMuted },
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
    borderRadius: radii.round,
    padding: spacing.xs,
    borderWidth: 1,
    minHeight: 44,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
  },
  labelSelected: {
    fontFamily: typography.bodySemiBold,
    fontWeight: '700',
  },
});
