/**
 * UI Theme Tokens and Typography for Wini Home Dashboard.
 * Extracted directly from Figma design frame #1128:2 (Android Compact - 1).
 */

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export const theme = {
  colors: {
    // Canvas & backgrounds
    background: '#000000',
    card: '#111111',
    cardBorder: 'rgba(255, 255, 255, 0.10)',
    cardInnerCircle: 'rgba(255, 255, 255, 0.08)',
    cardInnerCircleBorder: 'rgba(255, 255, 255, 0.04)',

    // Text colors from Figma tokens
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.70)',
    textMuted: 'rgba(255, 255, 255, 0.60)',
    textTertiary: 'rgba(255, 255, 255, 0.20)',

    // Financial intent
    income: '#7DF2A3',
    expense: '#FF6B7A',

    // Accounts section styling
    accountCard: {
      gradient: ['#0A5CC7', '#1E70E8', '#6366F1'] as const,
      bgFallback: 'rgba(10, 92, 199, 0.55)',
      border: 'rgba(255, 255, 255, 0.13)',
      badgeBg: 'rgba(255, 255, 255, 0.20)',
      badgeBorder: 'rgba(255, 255, 255, 0.20)',
      arrowBadgeBg: 'rgba(255, 255, 255, 0.18)',
      refreshBtnBg: 'rgba(255, 255, 255, 0.15)',
    },

    // Fixed Mic Orb button
    micButton: {
      gradient: ['#00C6FF', '#0072FF', '#7C3AED'] as const,
    },

    // Hero blobs gradient stops
    heroBlobs: {
      cyanBlue: ['#00D2FF', '#0072FF'] as const,
      bluePurple: ['#3B5AFB', '#8E2DE2'] as const,
    },
  },

  gradients: {
    heroLeftBlob: ['#00D2FF', '#0072FF'] as const,
    heroRightBlob: ['#3B5AFB', '#8E2DE2'] as const,
    sbiCard: ['#0A5CC7', '#1E70E8', '#6366F1'] as const,
    micOrb: ['#00C6FF', '#0072FF', '#7C3AED'] as const,
  },

  letterSpacing: {
    // 0.0429em for 14px uppercase labels per Figma style_2f81ae6e
    uppercaseLabel: 0.6,
    uppercaseLabelWide: 1.2,
    amountTight: -0.5,
  },

  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  typography: {
    // Hero
    heroLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.6,
      color: 'rgba(255, 255, 255, 0.70)',
      textTransform: 'uppercase' as const,
    },
    heroAmount: {
      fontFamily: 'Inter_700Bold',
      fontSize: 56,
      lineHeight: 64,
      letterSpacing: -0.5,
      color: '#FFFFFF',
    },

    // Section headers
    sectionLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.6,
      color: 'rgba(255, 255, 255, 0.70)',
      textTransform: 'uppercase' as const,
    },
    sectionCount: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255, 255, 255, 0.60)',
    },
    sectionChevron: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      lineHeight: 18,
      color: 'rgba(255, 255, 255, 0.60)',
    },

    // Transaction rows
    rowDate: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      lineHeight: 16,
      color: '#FFFFFF',
    },
    rowTime: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 14,
      color: 'rgba(255, 255, 255, 0.60)',
    },
    rowTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      lineHeight: 18,
      color: '#FFFFFF',
    },
    rowSubtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255, 255, 255, 0.60)',
    },
    rowAmount: {
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      lineHeight: 18,
      color: '#FFFFFF',
    },

    // Account card
    accountBalance: {
      fontFamily: 'Inter_700Bold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: '#FFFFFF',
    },
    accountBankName: {
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      lineHeight: 20,
      color: '#FFFFFF',
    },
    accountMasked: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255, 255, 255, 0.70)',
    },
    accountTimestamp: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 14,
      color: 'rgba(255, 255, 255, 0.80)',
    },
    accountSecondary: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      lineHeight: 16,
      color: '#FFFFFF',
    },
  },

  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    horizontalPadding: 20,
    contentGap: 28,
    // Uniform 40dp section spacing requested by user
    sectionGap: 40,
    heroToRecentTransactionsGap: 40,
    lastTransactionToAccountsGap: 40,
    sectionHeaderToContentGap: 12,
    rowGap: 10,
    footerHeight: 137,
    footerTopGap: 24,
    footerBottomGap: 41,
    micBottomOffset: 41, // Figma y: 804 in 917 frame (917 - 876 = 41)
    contentPaddingBottom: 161, // footerHeight (137) + footerTopGap (24) so Accounts card scrolls fully clear
  },

  radii: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    rowCard: 16,
    accountCard: 20,
    circleIcon: 18,
    arrowBadge: 13,
    refreshBtn: 15,
    micOrb: 36,
    full: 9999,
  },

  dimensions: {
    heroHeight: 380, // Aligned to blobs height 380dp so bottom edge matches visually
    heroTopPadding: 154,
    heroBlobsWidth: 733,
    heroBlobsHeight: 380,
    iconContainerSize: 36,
    iconSize: 18,
    accountCardHeight: 148,
    accountLogoBadge: 40,
    micSize: 72,
    micButtonSize: 72,
    micIconSize: 28,
    footerHeight: 137,
    footerTopGap: 24,
    footerBottomGap: 41,
  },

  shadows: {
    // 0px 8px 24px 0px rgba(21, 101, 192, 0.33)
    accountCard: {
      shadowColor: '#1565C0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.33,
      shadowRadius: 24,
      elevation: 8,
    },
    // 0px 10px 24px 0px rgba(0, 0, 0, 0.25)
    micButton: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    },
    micGlow: {
      shadowColor: '#00C6FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;

export function useInterThemeFonts() {
  return useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
}
