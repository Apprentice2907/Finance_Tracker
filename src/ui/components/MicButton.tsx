/**
 * MicButton Component
 * Exact 72x72 circular gradient orb matching Figma node #1143:63 ("ai-button").
 * Cyan-to-blue-to-purple gradient with grain, centered white vector mic icon (28dp),
 * and react-native-reanimated 0.95 press-scale feedback.
 */

import React from 'react';
import {
  Pressable,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { MicIcon } from './FigmaIcons';

export interface MicButtonProps {
  onPress?: () => void;
  isListening?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const MicButton: React.FC<MicButtonProps> = ({
  onPress,
  isListening = false,
  size = theme.dimensions.micSize, // Exactly 72dp
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 220 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, { damping: 15, stiffness: 220 });
  };

  const radius = size / 2; // 36dp for 72dp orb

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Voice Input"
      >
        {/* Full 72x72 Cyan-Blue-Purple Gradient */}
        <LinearGradient
          colors={['#00E5FF', '#0072FF', '#8B5CF6']}
          start={{ x: 0.1, y: 0.0 }}
          end={{ x: 0.9, y: 1.0 }}
          style={[
            styles.gradientFill,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          {/* Subtle noise grain texture overlay */}
          <Image
            source={require('../../../assets/images/gradient-noise-texture.png')}
            style={[
              styles.noiseOverlay,
              {
                width: size,
                height: size,
                borderRadius: radius,
              },
            ]}
            resizeMode="cover"
          />

          {/* Centered White Vector Microphone Icon (exact 28dp from Figma) */}
          <View style={styles.iconContainer} pointerEvents="none">
            <MicIcon size={theme.dimensions.micIconSize} color="#FFFFFF" />
          </View>
        </LinearGradient>

        {/* Outer pulse ring when voice listening is active */}
        {isListening && (
          <View
            style={[
              styles.pulseRing,
              {
                width: size + 16,
                height: size + 16,
                borderRadius: (size + 16) / 2,
              },
            ]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: theme.dimensions.micSize,
    height: theme.dimensions.micSize,
    borderRadius: theme.dimensions.micSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    // Figma boxShadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.25) + cyan ambient glow
    shadowColor: '#00C6FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.25,
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00E5FF',
    opacity: 0.8,
  },
});
