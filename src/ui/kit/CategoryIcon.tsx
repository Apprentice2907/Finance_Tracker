/**
 * CategoryIcon squircle component for Wini.
 * Where it fits: Used on category lists, transaction rows, tiles, and sheets.
 *
 * Implements WINI_DESIGN_SPEC.md Section 3.3 & 5.6:
 * - Squircle container (radius 14 on 44px box)
 * - Night: Filled with category colour and near-black glyph (#0B0B0D)
 * - Pocket: Tinted 14% category colour background with coloured glyph
 * - Uses Ionicons or fallback emoji
 */

import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, categoryColors, nightColors } from '../tokens';
import { useTheme } from '../ThemeContext';

export interface CategoryIconProps {
  name?: string; // Ionicons name or category name
  color?: string; // hex category color
  emoji?: string; // optional fallback emoji
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant',
  transport: 'car',
  shopping: 'bag-handle',
  bills: 'receipt',
  health: 'heart',
  fun: 'game-controller',
  education: 'school',
  other: 'ellipsis-horizontal',
  income: 'trending-up',
  salary: 'briefcase',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = 'other',
  color = categoryColors.grey,
  emoji,
  size = 'md',
  style,
}) => {
  const { isDark } = useTheme();

  const dimensions = {
    sm: { box: 32, icon: 16, radius: 10, emoji: 14 },
    md: { box: 44, icon: 22, radius: radii.lg, emoji: 20 },
    lg: { box: 54, icon: 28, radius: radii.xl, emoji: 26 },
  }[size];

  // Resolve Ionicons glyph
  const cleanName = name.toLowerCase().trim();
  const ioniconKey =
    DEFAULT_CATEGORY_ICONS[cleanName] ||
    ((cleanName in Ionicons.glyphMap ? cleanName : 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap);

  // Background and glyph styling by theme
  const containerBg = isDark ? color : `${color}24`; // 14% tint in Pocket
  const glyphColor = isDark ? nightColors.onAccent : color;

  return (
    <View
      style={[
        styles.squircle,
        {
          width: dimensions.box,
          height: dimensions.box,
          borderRadius: dimensions.radius,
          backgroundColor: containerBg,
        },
        style,
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: dimensions.emoji }}>{emoji}</Text>
      ) : (
        <Ionicons name={ioniconKey} size={dimensions.icon} color={glyphColor} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  squircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
