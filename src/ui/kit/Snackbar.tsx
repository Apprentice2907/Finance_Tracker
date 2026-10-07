/**
 * Auto-add Snackbar / Notification banner for Wini.
 * Where it fits: Displayed at the bottom above navigation when an auto-add action succeeds.
 *
 * Implements WINI_V2_FEATURES.md Section 4.2:
 * - 8-second auto-dismissing banner: "Added ₹10 · Transport · Today"
 * - Quick action buttons for "Undo" and "Edit" with 48px touch targets
 * - Smooth slide-in animation and themed surface styling
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { colors, radii, spacing, typography } from '../tokens';

export interface SnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onEdit: () => void;
  onDismiss?: () => void;
  durationMs?: number;
  bottomOffset?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  onUndo,
  onEdit,
  onDismiss,
  durationMs = 8000,
  bottomOffset = 90,
}) => {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(100));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onDismiss?.();
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, durationMs, onDismiss, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset + Math.max(insets.bottom, spacing.sm),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor: themeColors.surface2,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.message, { color: themeColors.text }]} numberOfLines={1}>
          {message}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onUndo}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={[styles.undoText, { color: themeColors.accent }]}>Undo</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={[styles.editText, { color: colors.white }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    marginRight: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  undoText: {
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeSm,
  },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: spacing.xs,
  },
  editText: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
});
