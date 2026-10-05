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

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.actions}>
        {onRetry ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRetry}
            style={styles.retryButton}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
        {onDismiss ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDismiss}
            style={styles.dismissButton}
            accessibilityRole="button"
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: typography.sizeBase,
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    marginRight: spacing.xs,
  },
  retryText: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeXs,
    color: colors.white,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  dismissText: {
    color: colors.muted,
    fontSize: typography.sizeBase,
    fontWeight: 'bold',
  },
});
