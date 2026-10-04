/**
 * Central UI Design Tokens for Wini (Colors, Spacing, Border Radii).
 * Where it fits: Imported by all React Native components and screens for styling.
 *
 * Beginner note: What are "Design Tokens"? Instead of scattering raw hex codes like
 * `#3B6EF5` and random pixel numbers across 20 files, design tokens store your app's
 * visual palette in one place. Want to change Wini's theme? Change it here and the
 * whole app updates consistently!
 */

export const colors = {
  background: '#0A0F1E',
  surface: '#121A30',
  elevated: '#1A2442',
  elevatedBorder: '#27355B',

  primary: '#3B6EF5',
  primaryHover: '#2A5CDA',
  primaryMuted: 'rgba(59, 110, 245, 0.15)',

  income: '#2ECC8F',
  incomeMuted: 'rgba(46, 204, 143, 0.15)',

  expense: '#FF6B7A',
  expenseMuted: 'rgba(255, 107, 122, 0.15)',

  warning: '#FFC857',
  warningMuted: 'rgba(255, 200, 87, 0.15)',

  text: '#F2F5FF',
  textSecondary: '#C5CEE0',
  muted: '#8A94AD',
  border: 'rgba(138, 148, 173, 0.2)',

  glass: 'rgba(26, 36, 66, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  cardOverlay: 'rgba(10, 15, 30, 0.65)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const typography = {
  displaySerif: 'DMSerifDisplay_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};
