/**
 * Exact vector icons extracted from Figma frame #1128:2
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function CoffeeIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7.5 1.5V3M10.5 1.5V3M12 6C12.2 6 12.39 6.08 12.53 6.22C12.67 6.36 12.75 6.55 12.75 6.75V12.75C12.75 13.55 12.43 14.31 11.87 14.87C11.31 15.43 10.55 15.75 9.75 15.75H5.25C4.45 15.75 3.69 15.43 3.13 14.87C2.57 14.31 2.25 13.55 2.25 12.75V6.75C2.25 6.55 2.33 6.36 2.47 6.22C2.61 6.08 2.8 6 3 6H13.5C14.3 6 15.06 6.32 15.62 6.88C16.18 7.44 16.5 8.2 16.5 9C16.5 9.8 16.18 10.56 15.62 11.12C15.06 11.68 14.3 12 13.5 12H12.75M4.5 1.5V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ShoppingBagIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M12 7.5C12 8.3 11.68 9.06 11.12 9.62C10.56 10.18 9.8 10.5 9 10.5C8.2 10.5 7.44 10.18 6.88 9.62C6.32 9.06 6 8.3 6 7.5M2.33 4.53H15.67M2.55 4.1C2.36 4.36 2.25 4.68 2.25 5V15C2.25 15.4 2.41 15.78 2.69 16.06C2.97 16.34 3.35 16.5 3.75 16.5H14.25C14.65 16.5 15.03 16.34 15.31 16.06C15.59 15.78 15.75 15.4 15.75 15V5C15.75 4.68 15.64 4.36 15.45 4.1L13.95 2.1C13.81 1.91 13.63 1.76 13.42 1.66C13.21 1.55 12.98 1.5 12.75 1.5H5.25C5.02 1.5 4.79 1.55 4.58 1.66C4.37 1.76 4.19 1.91 4.05 2.1L2.55 4.1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BriefcaseIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M12 15V3C12 2.6 11.84 2.22 11.56 1.94C11.28 1.66 10.9 1.5 10.5 1.5H7.5C7.1 1.5 6.72 1.66 6.44 1.94C6.16 2.22 6 2.6 6 3V15M3 4.5H15C15.83 4.5 16.5 5.17 16.5 6V13.5C16.5 14.33 15.83 15 15 15H3C2.17 15 1.5 14.33 1.5 13.5V6C1.5 5.17 2.17 4.5 3 4.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CarIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M14.25 12.75H15.75C16.2 12.75 16.5 12.45 16.5 12V9.75C16.5 9.08 15.98 8.48 15.38 8.33C14.03 7.95 12 7.5 12 7.5C12 7.5 11.03 6.45 10.35 5.78C9.98 5.48 9.53 5.25 9 5.25H3.75C3.3 5.25 2.92 5.55 2.7 5.93L1.65 8.1C1.55 8.39 1.5 8.69 1.5 9V12C1.5 12.45 1.8 12.75 2.25 12.75H3.75M14.25 12.75C14.25 13.58 13.58 14.25 12.75 14.25C11.92 14.25 11.25 13.58 11.25 12.75M14.25 12.75C14.25 11.92 13.58 11.25 12.75 11.25C11.92 11.25 11.25 11.92 11.25 12.75M3.75 12.75C3.75 13.58 4.42 14.25 5.25 14.25C6.08 14.25 6.75 13.58 6.75 12.75M3.75 12.75C3.75 11.92 4.42 11.25 5.25 11.25C6.08 11.25 6.75 11.92 6.75 12.75M11.25 12.75H6.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SmartphoneIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 13.5H9.01M5.25 1.5H12.75C13.58 1.5 14.25 2.17 14.25 3V15C14.25 15.83 13.58 16.5 12.75 16.5H5.25C4.42 16.5 3.75 15.83 3.75 15V3C3.75 2.17 4.42 1.5 5.25 1.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ArrowUpRightIcon({ size = 14, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M9.92 9.92V4.08H4.08M9.92 4.08L4.08 9.92"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CreditCardIcon({ size = 13, color = 'rgba(255, 255, 255, 0.8)' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path
        d="M1.08 5.42H11.92M2.17 2.71H10.83C11.43 2.71 11.92 3.19 11.92 3.79V9.21C11.92 9.81 11.43 10.29 10.83 10.29H2.17C1.57 10.29 1.08 9.81 1.08 9.21V3.79C1.08 3.19 1.57 2.71 2.17 2.71Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function RefreshCwIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 8C2 6.41 2.63 4.88 3.76 3.76C4.88 2.63 6.41 2 8 2C9.68 2.01 11.29 2.66 12.49 3.83L14 5.33M10.67 5.33H14V2M14 8C14 9.59 13.37 11.12 12.24 12.24C11.12 13.37 9.59 14 8 14C6.32 13.99 4.71 13.34 3.51 12.17L2 10.67M2 14V10.67H5.33"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MicIcon({ size = 28, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 22.17V25.67M5.83 11.67V14C5.83 16.17 6.69 18.24 8.22 19.78C9.76 21.31 11.83 22.17 14 22.17C16.17 22.17 18.24 21.31 19.78 19.78C21.31 18.24 22.17 16.17 22.17 14V11.67M14 2.33C15.93 2.33 17.5 3.9 17.5 5.83V14C17.5 15.93 15.93 17.5 14 17.5C12.07 17.5 10.5 15.93 10.5 14V5.83C10.5 3.9 12.07 2.33 14 2.33Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
