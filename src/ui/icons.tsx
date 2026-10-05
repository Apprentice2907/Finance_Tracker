/**
 * Custom SVG vector icon components for Wini.
 * Where it fits: Used throughout navigation tabs, action buttons, and modal dialogs.
 *
 * Beginner note: Why use SVG vectors instead of image files (.png)?
 * SVGs are described with mathematical coordinates (paths), not pixels. They stay sharp
 * on any screen resolution, don't bloat the app download size, and let us change icon
 * colors dynamically using React props!
 */

import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from './tokens';

interface IconProps {
  size?: number;
  color?: string | any;
}

export const WalletIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 7V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15 7H21C21.5523 7 22 7.44772 22 8V16C22 16.5523 21.5523 17 21 17H15C14.4477 17 14 16.5523 14 16V8C14 7.44772 14.4477 7 15 7Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="18" cy="12" r="1" fill={color} />
  </Svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path d="M12 7V12L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ChartIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 20V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 20V4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M6 20V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Path
      d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L20.07 17.16A2 2 0 1 1 17.24 20L16.9 19.66A1.65 1.65 0 0 0 15.08 19.33A1.65 1.65 0 0 0 14 20.88V21.5A2 2 0 1 1 10 21.5V20.88A1.65 1.65 0 0 0 8.92 19.33A1.65 1.65 0 0 0 7.1 19.66L6.76 20A2 2 0 1 1 3.93 17.17L4.27 16.83A1.65 1.65 0 0 0 4.6 15.01A1.65 1.65 0 0 0 3.05 13.93H2.5A2 2 0 1 1 2.5 9.93H3.05A1.65 1.65 0 0 0 4.6 8.85A1.65 1.65 0 0 0 4.27 7.03L3.93 6.69A2 2 0 1 1 6.76 3.86L7.1 4.2A1.65 1.65 0 0 0 8.92 4.53A1.65 1.65 0 0 0 10 2.98V2.5A2 2 0 1 1 14 2.5V2.98A1.65 1.65 0 0 0 15.08 4.53A1.65 1.65 0 0 0 16.9 4.2L17.24 3.86A2 2 0 1 1 20.07 6.69L19.73 7.03A1.65 1.65 0 0 0 19.4 8.85A1.65 1.65 0 0 0 20.95 9.93H21.5A2 2 0 1 1 21.5 13.93H20.95A1.65 1.65 0 0 0 19.4 15Z"
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

export const MicIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth={2} />
    <Path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 18V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
    <Path d="M20 20L16 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const EyeIcon: React.FC<IconProps & { visible?: boolean }> = ({ size = 24, color = colors.white, visible = true }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={color} strokeWidth={2} />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 7.06L17.94 17.94Z" stroke={color} strokeWidth={2} />
        <Path d="M1 1L23 23" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

export const KeyboardIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth={2} />
    <Path d="M6 8H6.01M10 8H10.01M14 8H14.01M18 8H18.01M6 12H6.01M10 12H10.01M14 12H14.01M18 12H18.01M8 16H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ArrowTrendUpIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 6H23V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ArrowTrendDownIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 18L13.5 8.5L8.5 13.5L1 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 18H23V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ExportIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 3V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 7L12 3L16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ImportIcon: React.FC<IconProps> = ({ size = 24, color = colors.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 11L12 15L16 11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);


