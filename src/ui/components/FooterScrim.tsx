/**
 * FooterScrim Component
 * Fixed bottom gradient scrim matching Figma layer #1157:34 ("Dark microphone footer").
 * Fades from transparent at the top to solid black at the bottom.
 */

import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export interface FooterScrimProps {
  height?: number;
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export const FooterScrim: React.FC<FooterScrimProps> = ({
  height = theme.dimensions.footerHeight,
  bottomOffset = 0,
  style,
}) => {
  return (
    <LinearGradient
      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', '#000000']}
      locations={[0, 0.35, 0.7, 1.0]}
      style={[
        styles.scrim,
        {
          height: height + bottomOffset,
          bottom: bottomOffset,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
