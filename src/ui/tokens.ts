/**
 * Central UI Design Tokens for Wini (Night and Pocket themes, Typography, Spacing, Radii, Elevations, Motion).
 * Where it fits: Imported across the app and consumed via ThemeContext / useTheme().
 *
 * Designed according to WINI_DESIGN_SPEC.md:
 * - Night (Dark Fintech): Near-black background, lime-yellow accent (#F2F96E), glass fills, dark cards.
 * - Pocket (Light Wallet): Soft light grey background, vibrant blue accent (#2B5BE8), white cards, paper tones.
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  income: string;
  expense: string;
  danger: string;
  warning: string;
  chartTrack: string;
  chartLine: string;
  glassFill: string;
  glassBorder: string;
  navFill: string;
  paper: string;
  paperLine: string;

  // Account card accents (Pocket peeking cards)
  cardGreen?: string;
  cardYellow?: string;
  cardBlack?: string;

  // Compatibility aliases
  background: string;
  surfaceAlt: string;
  surfaceInput: string;
  elevated: string;
  elevatedBorder: string;
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  incomeMuted: string;
  expenseMuted: string;
  dangerMuted: string;
  warningMuted: string;
  muted: string;
  white: string;
  black: string;
  shadow: string;
  transparent: string;
  cardOverlay: string;
  modalBackdrop: string;
  chartBlueStart: string;
  chartBlueEnd: string;
  accentPurple: string;
  accentPurpleMuted: string;
  glass: string;
}

export const nightColors: ThemeColors = {
  bg: '#0B0B0D',
  surface: '#151517',
  surface2: '#1E1E21',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textSecondary: '#8E8E93',
  accent: '#F2F96E', // lime-yellow
  onAccent: '#0B0B0D',
  income: '#7CF2A0',
  expense: '#FF6B7A',
  danger: '#FF5A5F',
  warning: '#FFC83D',
  chartTrack: '#2A2A2E',
  chartLine: '#F2F96E',
  glassFill: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
  navFill: 'rgba(30,30,33,0.92)',
  paper: '#151517',
  paperLine: 'rgba(255,255,255,0.08)',
  cardGreen: '#7CF2A0',
  cardYellow: '#F2F96E',
  cardBlack: '#0B0B0D',

  // Compatibility aliases
  background: '#0B0B0D',
  surfaceAlt: '#1E1E21',
  surfaceInput: '#1E1E21',
  elevated: '#1E1E21',
  elevatedBorder: 'rgba(255,255,255,0.08)',
  primary: '#F2F96E',
  primaryHover: '#DDE55B',
  primaryMuted: 'rgba(242, 249, 110, 0.15)',
  incomeMuted: 'rgba(124, 242, 160, 0.15)',
  expenseMuted: 'rgba(255, 107, 122, 0.15)',
  dangerMuted: 'rgba(255, 90, 95, 0.15)',
  warningMuted: 'rgba(255, 200, 61, 0.15)',
  muted: '#8E8E93',
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#000000',
  transparent: 'transparent',
  cardOverlay: 'rgba(11, 11, 13, 0.65)',
  modalBackdrop: 'rgba(0, 0, 0, 0.75)',
  chartBlueStart: '#7A5CFA',
  chartBlueEnd: '#2F6BFF',
  accentPurple: '#7A5CFA',
  accentPurpleMuted: 'rgba(122, 92, 250, 0.15)',
  glass: 'rgba(255, 255, 255, 0.06)',
};

export const pocketColors: ThemeColors = {
  bg: '#F3F4F7',
  surface: '#FFFFFF',
  surface2: '#F6F7FA',
  border: 'rgba(10,15,30,0.06)',
  text: '#14161B',
  textMuted: '#7A8494',
  textSecondary: '#7A8494',
  accent: '#2B5BE8', // blue
  onAccent: '#FFFFFF',
  income: '#12B76A',
  expense: '#E5484D',
  danger: '#E5484D',
  warning: '#FFC83D',
  chartTrack: '#E6E8EF',
  chartLine: '#3B6CF5',
  cardGreen: '#19F07C',
  cardYellow: '#FFD60F',
  cardBlack: '#04050A',
  glassFill: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.28)',
  navFill: 'rgba(255,255,255,0.96)',
  paper: '#FBF7EE',
  paperLine: '#E9E1CF',

  // Compatibility aliases
  background: '#F3F4F7',
  surfaceAlt: '#F6F7FA',
  surfaceInput: '#FFFFFF',
  elevated: '#FFFFFF',
  elevatedBorder: 'rgba(10,15,30,0.06)',
  primary: '#2B5BE8',
  primaryHover: '#1E4AC8',
  primaryMuted: 'rgba(43, 91, 232, 0.12)',
  incomeMuted: 'rgba(18, 183, 106, 0.12)',
  expenseMuted: 'rgba(229, 72, 77, 0.12)',
  dangerMuted: 'rgba(229, 72, 77, 0.12)',
  warningMuted: 'rgba(255, 200, 61, 0.15)',
  muted: '#7A8494',
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#141E3C',
  transparent: 'transparent',
  cardOverlay: 'rgba(243, 244, 247, 0.65)',
  modalBackdrop: 'rgba(10, 15, 30, 0.5)',
  chartBlueStart: '#3B6CF5',
  chartBlueEnd: '#1E4AC8',
  accentPurple: '#7A5CFA',
  accentPurpleMuted: 'rgba(122, 92, 250, 0.15)',
  glass: 'rgba(255, 255, 255, 0.14)',
};

export const categoryColors: Record<string, string> = {
  yellow: '#FFC83D',
  mint: '#2EE6A6',
  violet: '#7A5CFA',
  magenta: '#E5338A',
  blue: '#2F6BFF',
  cyan: '#35D0F2',
  orange: '#FF8A3D',
  lime: '#B8E04A',
  pink: '#FF8FD0',
  coral: '#FF6B6B',
  teal: '#1FB6A6',
  grey: '#8E8E93',
};

// Default export uses nightColors for static/fallback access
export const colors: ThemeColors = nightColors;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  tile: 20,
  card: 24,
  round: 9999,
  full: 9999,
};

export const typography = {
  displaySerif: 'DMSerifDisplay_400Regular',
  body: 'Inter_400Regular',
  bodyLight: 'Inter_300Light',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  // Font sizes according to spec scale
  sizeCaption: 12,
  sizeBody: 14,
  sizeLabel: 15,
  sizeTitle: 20,
  sizeHeading: 28,
  sizeHeroSm: 44,
  sizeHero: 56,

  // Compatibility sizes
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeBase: 16,
  sizeLg: 18,
  sizeXl: 20,
  sizeXxl: 24,
  sizeDisplay: 32,

  // Line heights
  lineHeightXs: 14,
  lineHeightSm: 18,
  lineHeightMd: 22,
  lineHeightBase: 24,
  lineHeightLg: 26,
  lineHeightXl: 28,
  lineHeightXxl: 32,
  lineHeightDisplay: 40,
  lineHeightHero: 64,
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
    shadowColor: '#141E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#141E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#141E3C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
};
