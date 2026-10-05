import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../tokens';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  statusBarStyle?: 'light-content' | 'dark-content';
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
  statusBarStyle = 'light-content',
}) => {
  return (
    <SafeAreaView edges={safeAreaEdges} style={[styles.container, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={colors.background} />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  content: {
    flex: 1,
  },
});
