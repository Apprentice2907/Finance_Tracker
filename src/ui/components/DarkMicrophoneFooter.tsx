/**
 * DarkMicrophoneFooter Component
 * Solid black box fixed to screen bottom matching Figma frame layer #1157:34 ("Dark microphone footer").
 * Houses the 72x72 Mic Orb with exact 24dp top gap and 41dp bottom gap (24 + 72 + 41 = 137).
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { MicButton } from './MicButton';

export interface DarkMicrophoneFooterProps {
  onPressMic?: () => void;
  isListening?: boolean;
  bottomInset?: number;
  bottomOffset?: number; // Used if placed above a bottom tab bar
  style?: StyleProp<ViewStyle>;
}

export const DarkMicrophoneFooter: React.FC<DarkMicrophoneFooterProps> = ({
  onPressMic,
  isListening = false,
  bottomInset = 0,
  bottomOffset = 0,
  style,
}) => {
  // If the device's bottom safe-area inset > 41dp, extend black box downward so nothing shows below it
  const extraBottomPadding = Math.max(0, bottomInset - theme.spacing.footerBottomGap);
  const totalHeight = theme.dimensions.footerHeight + extraBottomPadding;

  return (
    <View
      style={[
        styles.footerContainer,
        {
          height: totalHeight,
          bottom: bottomOffset,
        },
        style,
      ]}
    >
      {/* 72x72 Orb with marginTop: 24dp, alignSelf: center */}
      <MicButton
        onPress={onPressMic}
        isListening={isListening}
        size={theme.dimensions.micSize}
        style={styles.micButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background, // Pure solid black #000000, 100% opaque
    alignItems: 'center',
    zIndex: 100, // Above ScrollView content
    elevation: 10, // Android z-ordering
  },
  micButton: {
    marginTop: theme.spacing.footerTopGap, // Exact 24dp from top of footer
    alignSelf: 'center',
  },
});
