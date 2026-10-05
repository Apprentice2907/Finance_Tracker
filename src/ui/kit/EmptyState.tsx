import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, typography } from '../tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji,
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : icon ? (
        <View style={styles.iconWrapper}>{icon}</View>
      ) : null}

      <Text style={styles.title}>{title}</Text>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {actionTitle && onAction ? (
        <View style={styles.actionContainer}>
          <Button
            title={actionTitle}
            onPress={onAction}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  iconWrapper: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeLg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.lineHeightMd,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});
