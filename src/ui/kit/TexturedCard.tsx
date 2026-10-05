/**
 * TexturedCard component for Wini.
 * Where it fits: Used for hero cards (Net Balance, ConfirmSheet) and account passbook cards.
 *
 * Implements WINI_DESIGN_SPEC.md Section 4:
 * - Pre-rendered galaxy textures with fine grain (aurora, nebula, cosmos, ember, midnight)
 * - Clipped rounded rectangle (radius 24)
 * - Subtle dark scrim (15-25%) to ensure >= 4.5:1 text contrast
 * - Never animated; static image preserves smooth scrolling
 */

import React from 'react';
import {
  StyleSheet,
  View,
  ImageBackground,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { radii, spacing } from '../tokens';

export type TextureKey = 'aurora' | 'nebula' | 'cosmos' | 'ember' | 'midnight';

export const TEXTURE_ASSETS: Record<TextureKey, any> = {
  aurora: require('../../../assets/textures/aurora.jpg'),
  nebula: require('../../../assets/textures/nebula.jpg'),
  cosmos: require('../../../assets/textures/cosmos.jpg'),
  ember: require('../../../assets/textures/ember.jpg'),
  midnight: require('../../../assets/textures/midnight.jpg'),
};

export interface TexturedCardProps {
  children: React.ReactNode;
  texture?: TextureKey;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing | number;
  borderRadius?: number;
  scrimOpacity?: number;
  disabled?: boolean;
}

export const TexturedCard: React.FC<TexturedCardProps> = ({
  children,
  texture = 'aurora',
  onPress,
  style,
  padding = 'lg',
  borderRadius = radii.card,
  scrimOpacity = 0.18,
  disabled = false,
}) => {
  const padValue = typeof padding === 'number' ? padding : spacing[padding];
  const source = TEXTURE_ASSETS[texture] || TEXTURE_ASSETS.aurora;

  const content = (
    <ImageBackground
      source={source}
      resizeMode="cover"
      style={[styles.imageBackground, { borderRadius }]}
      imageStyle={{ borderRadius }}
    >
      {/* Dark scrim overlay for guaranteed contrast */}
      <View
        style={[
          styles.scrim,
          {
            backgroundColor: `rgba(0, 0, 0, ${scrimOpacity})`,
            padding: padValue,
            borderRadius,
          },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={[styles.container, { borderRadius }, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.container, { borderRadius }, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  imageBackground: {
    width: '100%',
    overflow: 'hidden',
  },
  scrim: {
    width: '100%',
    height: '100%',
  },
});
