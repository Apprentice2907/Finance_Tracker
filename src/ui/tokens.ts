/**
 * Central UI Design Tokens for Wini (Colors, Typography, Spacing, Radii, Elevations, Motion).
 * Where it fits: Imported by all React Native components, UI kit, and screens for styling.
 *
 * Beginner note: What are "Design Tokens"? Instead of scattering raw hex codes like
 * `#3B6EF5` and random pixel numbers across 20 files, design tokens store your app's
 * visual palette in one place. Want to change Wini's theme? Change it here and the
 * whole app updates consistently!
 */

export const colors = {
  background: '#0A0F1E',
  surface: '#121A30',
  surfaceAlt: '#0E172E',
  surfaceInput: '#131F3D',
  elevated: '#1A2442',
  elevatedBorder: '#27355B',

  primary: '#3B6EF5',
  primaryHover: '#2A5CDA',
  primaryMuted: 'rgba(59, 110, 245, 0.15)',

  income: '#2ECC8F',
  incomeMuted: 'rgba(46, 204, 143, 0.15)',

  expense: '#FF6B7A',
  expenseMuted: 'rgba(255, 107, 122, 0.15)',

  danger: '#FF4D63',
  dangerMuted: 'rgba(255, 77, 99, 0.15)',

  warning: '#FFC857',
  warningMuted: 'rgba(255, 200, 87, 0.15)',

  accentPurple: '#9D8CFF',
  accentPurpleMuted: 'rgba(157, 140, 255, 0.15)',

  chartBlueStart: '#6C97FF',
  chartBlueEnd: '#1B3E9E',

  text: '#F2F5FF',
  textSecondary: '#C5CEE0',
  muted: '#8A94AD',
  border: 'rgba(138, 148, 173, 0.2)',

  white: '#FFFFFF',
  black: '#000000',
  shadow: '#000000',
  transparent: 'transparent',

  glass: 'rgba(26, 36, 66, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  cardOverlay: 'rgba(10, 15, 30, 0.65)',
  modalBackdrop: 'rgba(0, 0, 0, 0.7)',
};

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 9999,
  full: 9999,
};

export const typography = {
  displaySerif: 'DMSerifDisplay_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  // Font sizes
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeBase: 16,
  sizeLg: 18,
  sizeXl: 20,
  sizeXxl: 24,
  sizeDisplay: 32,
  sizeHero: 40,

  // Line heights
  lineHeightXs: 14,
  lineHeightSm: 18,
  lineHeightMd: 22,
  lineHeightBase: 24,
  lineHeightLg: 26,
  lineHeightXl: 28,
  lineHeightXxl: 32,
  lineHeightDisplay: 40,
};

export const elevations = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
};
