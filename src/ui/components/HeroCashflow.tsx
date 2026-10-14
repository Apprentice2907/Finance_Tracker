/**
 * HeroCashflow Component
 * Pure presentational Hero component matching Figma node #1143:5 & #1130:11.
 * Uses exported 3x grainy gradient blobs image from Figma.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import { theme } from '../theme';

export interface HeroCashflowProps {
  amount: string; // e.g. "-₹1,240"
  label?: string; // defaults to "TOTAL CASHFLOW"
  style?: StyleProp<ViewStyle>;
  blobsTranslateY?: Animated.AnimatedInterpolation<number> | number;
  blobsOpacity?: Animated.AnimatedInterpolation<number> | number;
}

export const HeroCashflow: React.FC<HeroCashflowProps> = ({
  amount,
  label = 'TOTAL CASHFLOW',
  style,
  blobsTranslateY,
  blobsOpacity,
}) => {
  const animatedBlobsStyle = {
    transform: [{ translateY: blobsTranslateY ?? 0 }],
    opacity: blobsOpacity ?? 1,
  };

  return (
    <View style={[styles.container, style]}>
      {/* 3x Grainy Gradient Blobs exported from Figma */}
      <Animated.View style={[styles.blobsWrapper, animatedBlobsStyle]}>
        <Image
          source={require('../../../assets/images/hero-blobs.png')}
          style={styles.blobsImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Hero Typography Content */}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: theme.dimensions.heroHeight,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  blobsWrapper: {
    position: 'absolute',
    top: 0,
    width: theme.dimensions.heroBlobsWidth,
    height: theme.dimensions.heroBlobsHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobsImage: {
    width: theme.dimensions.heroBlobsWidth,
    height: theme.dimensions.heroBlobsHeight,
  },
  content: {
    paddingTop: theme.dimensions.heroTopPadding,
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  label: {
    ...theme.typography.heroLabel,
  },
  amount: {
    ...theme.typography.heroAmount,
  },
});
