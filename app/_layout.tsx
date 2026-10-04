/**
 * Root Layout and Tab Navigation shell for Wini.
 * Where it fits: The root component wrapping every screen in the application.
 *
 * Beginner note: What is `expo-router`? Expo Router uses "file-based routing" (similar
 * to Next.js on the web). Instead of configuring navigation stacks in code, files inside
 * the `app/` folder automatically become screens: `app/index.tsx` is Home, `app/history.tsx`
 * is History, etc.
 */

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/ui/tokens';
import { WalletIcon, HistoryIcon, ChartIcon, SettingsIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { useAppStore } from '../src/state/useAppStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
  });

  const init = useAppStore((state) => state.init);

  useEffect(() => {
    init().catch(console.error);
  }, [init]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary fallbackTitle="Wini encountered a problem">
      <View style={styles.container}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.muted,
            tabBarShowLabel: true,
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <WalletIcon size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color }) => <HistoryIcon size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="insights"
            options={{
              title: 'Insights',
              tabBarIcon: ({ color }) => <ChartIcon size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="voice-lab"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
