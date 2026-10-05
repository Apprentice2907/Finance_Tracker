import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, typography } from '../tokens';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionText && onAction && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAction}
          style={styles.actionButton}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeLg,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    color: colors.muted,
    marginTop: 2,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  actionText: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
    color: colors.primary,
  },
});
