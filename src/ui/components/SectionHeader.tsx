/**
 * SectionHeader Component
 * Pure presentational header row matching Figma frame #1143:9 & #1157:4.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface SectionHeaderProps {
  title: string;
  rightText?: string;
  onPressRight?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  rightText,
  onPressRight,
  style,
}) => {
  const isChevron = rightText === '>';

  const rightContent = rightText ? (
    <Text style={isChevron ? styles.chevron : styles.count}>{rightText}</Text>
  ) : null;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {onPressRight ? (
        <TouchableOpacity
          onPress={onPressRight}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          {rightContent}
        </TouchableOpacity>
      ) : (
        rightContent
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    ...theme.typography.sectionLabel,
  },
  count: {
    ...theme.typography.sectionCount,
  },
  chevron: {
    ...theme.typography.sectionChevron,
  },
});
