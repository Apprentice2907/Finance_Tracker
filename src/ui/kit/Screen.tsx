import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { spacing } from '../tokens';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  hasTabBar?: boolean;
  withTopInset?: boolean;
  withBottomInset?: boolean;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  hasTabBar = true,
  withTopInset = true,
  withBottomInset = !hasTabBar,
  style,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Tab bar base (56) + insets.bottom + clearance for floating action / bottom elements
  const tabBarHeight = 56 + Math.max(insets.bottom, 8);
  const bottomScrollPadding = hasTabBar
    ? tabBarHeight + spacing.xl + 20
    : (withBottomInset ? insets.bottom + spacing.xl : spacing.xl);

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: withTopInset ? insets.top : 0,
    paddingBottom: (!hasTabBar && withBottomInset) ? insets.bottom : 0,
  };

  return (
    <View style={[containerStyle, style]}>
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            { paddingBottom: bottomScrollPadding },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
