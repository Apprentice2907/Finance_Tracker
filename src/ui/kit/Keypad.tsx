/**
 * Keypad component for Wini.
 * Where it fits: Used on ConfirmSheet and manual expense entry for fast amount input.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.10 & Dark set B:
 * - 3x4 layout: 1-9, '.', 0, '⌫' (backspace)
 * - Clean keys with subtle borders and touch feedback
 * - Haptic tick on key press
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography } from '../tokens';
import { useTheme } from '../ThemeContext';

export interface KeypadProps {
  onDigit: (char: string) => void;
  onDelete: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Keypad: React.FC<KeypadProps> = ({ onDigit, onDelete, style }) => {
  const { colors } = useTheme();

  const handlePress = (char: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (char === 'del') {
      onDelete();
    } else {
      onDigit(char);
    }
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'del'],
  ];

  return (
    <View style={[styles.container, style]}>
      {keys.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((k) => (
            <TouchableOpacity
              key={k}
              activeOpacity={0.65}
              onPress={() => handlePress(k)}
              style={[
                styles.key,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k}
            >
              {k === 'del' ? (
                <Ionicons name="backspace-outline" size={24} color={colors.text} />
              ) : (
                <Text style={[styles.keyText, { color: colors.text }]}>{k}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    borderWidth: 1,
  },
  keyText: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeXl,
  },
});
