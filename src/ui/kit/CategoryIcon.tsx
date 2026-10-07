/**
 * CategoryIcon component for Wini.
 * Where it fits: Used on category lists, transaction rows, tiles, and sheets.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.4:
 * - Line icons from @expo/vector-icons (Ionicons outline set) as white single-colour glyphs
 * - Default: glass circle holder (44px, fill glassFill, 1px glassBorder)
 * - Alternate: block holder (solid surface2 rounded square, radius 14)
 * - Sizes: sm (32px), md (44px), lg (54px)
 */

import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '../tokens';
import { useTheme } from '../ThemeContext';
import { mapEmojiOrNameToIcon, IconKey } from '../../domain/categories';

export interface CategoryIconProps {
  /** Ionicons outline name, category name, or category icon key */
  name?: string | null;
  /** Optional icon key */
  iconKey?: IconKey;
  /** Optional fallback emoji (converted to vector icon) */
  emoji?: string | null;
  /** Optional glyph / accent color */
  color?: string;
  /** Variant: 'glass' (circle with glass border), 'block' (surface2 rounded square), or 'plain' (just glyph) */
  variant?: 'glass' | 'block' | 'plain';
  /** Preset size ('sm' | 'md' | 'lg') or numeric pixel size */
  size?: 'sm' | 'md' | 'lg' | number;
  style?: StyleProp<ViewStyle>;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  iconKey,
  emoji,
  color,
  variant = 'glass',
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  const dimensions = typeof size === 'number'
    ? { box: size, icon: Math.round(size * 0.55), radius: variant === 'glass' ? radii.round : 10 }
    : {
        sm: { box: 32, icon: 16, radius: variant === 'glass' ? radii.round : 10 },
        md: { box: 44, icon: 22, radius: variant === 'glass' ? radii.round : 14 },
        lg: { box: 54, icon: 26, radius: variant === 'glass' ? radii.round : 18 },
      }[size];

  // Resolve vector icon key: if iconKey is provided, use it; otherwise resolve via emoji or name
  const resolvedKey = iconKey || mapEmojiOrNameToIcon(name || emoji);

  if (variant === 'plain') {
    const plainSize = typeof size === 'number' ? size : dimensions.icon;
    return (
      <Ionicons
        name={resolvedKey as keyof typeof Ionicons.glyphMap}
        size={plainSize}
        color={color || colors.white}
      />
    );
  }

  // Background and border styling
  const isGlass = variant === 'glass';
  const containerBg = isGlass ? colors.glassFill : colors.surface2;
  const borderColor = isGlass ? colors.glassBorder : colors.border;
  const glyphColor = color || colors.white;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.box,
          height: dimensions.box,
          borderRadius: dimensions.radius,
          backgroundColor: containerBg,
          borderColor,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={resolvedKey as keyof typeof Ionicons.glyphMap}
        size={dimensions.icon}
        color={glyphColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

