/**
 * SegmentedControl component for Wini.
 * Where it fits: Used for Expenses | Income toggle, Period selection, and subview switches.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.2:
 * - Track: surface2, height 48px, radius 999, 4px inner padding
 * - Active segment: solid white pill with black semibold text
 * - Inactive text: textMuted / near-white
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
import { radii, typography } from '../tokens';
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
  const { colors } = useTheme();

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
        const inactiveText = colors.textMuted;

        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              isSelected && {
                backgroundColor: activeBg,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text
              style={[
                styles.label,
                { color: isSelected ? activeText : inactiveText },
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
    padding: 4,
    borderWidth: 1,
    height: 48,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
  },
  labelSelected: {
    fontFamily: typography.bodySemiBold,
    fontWeight: '600',
  },
});
