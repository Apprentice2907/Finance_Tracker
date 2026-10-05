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

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  borderBottom?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron = false,
  borderBottom = false,
  disabled = false,
  style,
}) => {
  const content = (
    <View style={[styles.container, borderBottom && styles.borderBottom, style]}>
      {left && <View style={styles.leftContainer}>{left}</View>}
      <View style={styles.centerContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {(right || showChevron) && (
        <View style={styles.rightContainer}>
          {right}
          {showChevron && <Text style={styles.chevron}>›</Text>}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56, // Accessible touch target
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeBase,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    color: colors.muted,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  chevron: {
    fontSize: typography.sizeXl,
    color: colors.muted,
    marginLeft: spacing.xs,
  },
});
