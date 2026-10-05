/**
 * FloatingNav component for Wini.
 * Where it fits: Floating bottom navigation pill for the 5 main sections.
 *
 * Implements WINI_DESIGN_SPEC.md Section 5.8:
 * - Floating pill: 5 tabs (Home, Accounts, Reports, Categories, Settings)
 * - Height 64, pill border radius, glass/surface background
 * - Night: Circular accent +/mic button in the center
 * - Pocket: Soft grey pill with blue icon highlight
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography, elevations } from '../tokens';
import { useTheme } from '../ThemeContext';

export type NavTabKey = 'home' | 'accounts' | 'center' | 'reports' | 'settings';

export interface FloatingNavProps {
  activeTab: NavTabKey;
  onSelectTab: (tab: NavTabKey) => void;
  onCenterAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  onSelectTab,
  onCenterAction,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const tabs: { key: NavTabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: 'Home', icon: 'wallet-outline' },
    { key: 'accounts', label: 'Accounts', icon: 'card-outline' },
    { key: 'center', label: '', icon: 'mic' }, // Center Action
    { key: 'reports', label: 'Reports', icon: 'pie-chart-outline' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View
      style={[
        styles.navPill,
        {
          backgroundColor: colors.navFill,
          borderColor: colors.border,
          ...elevations.md,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        if (tab.key === 'center') {
          return (
            <TouchableOpacity
              key="center"
              activeOpacity={0.85}
              onPress={onCenterAction}
              style={[
                styles.centerButton,
                {
                  backgroundColor: colors.accent,
                  ...elevations.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Voice Add"
            >
              <Ionicons name="mic" size={24} color={colors.onAccent} />
            </TouchableOpacity>
          );
        }

        const isActive = activeTab === tab.key;
        const iconColor = isActive
          ? isDark
            ? colors.accent
            : colors.accent
          : colors.textMuted;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.key)}
            style={[
              styles.tabItem,
              isActive && {
                backgroundColor: colors.glassFill,
                borderRadius: radii.round,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons name={tab.icon} size={20} color={iconColor} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.text : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 54,
  },
  tabLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 10,
    marginTop: 2,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
});
