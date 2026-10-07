/**
 * DonutChart component for Wini.
 * Where it fits: Used on Home category breakdown card and Reports screen.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.3:
 * - Thick stroke (20% of diameter), rounded caps (strokeLinecap="round")
 * - 6° gap between segments, clockwise starting at 12 o'clock, largest first
 * - Step 1 palette: Mint, Cyan, White, Periwinkle, Lime, Pink, Orange, Lavender, Grey
 * - Centre: "Total expenses" (13px textMuted) above amount (32px bold white)
 * - 3-column legend with 10px dots and 13px names
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { chartPalette, typography, spacing } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import { computeDonutSegments } from './chartGeometry';

export interface DonutSegment {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  /** Primary center label (e.g. Total amount) */
  centerAmount?: string;
  /** Sub-label above amount (e.g. "Total expenses" or "Total income") */
  centerTitle?: string;
  showLegend?: boolean;
}

/** Re-export for backward compat / direct testing */
export { computeDonutSegments as computeDonutSegmentsGeometry } from './chartGeometry';

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = Math.min(Dimensions.get('window').width - 72, 220),
  centerAmount,
  centerTitle = 'Total expenses',
  showLegend = true,
}) => {
  const { colors } = useTheme();

  // Stroke width = 20% of diameter per Section 1.3
  const strokeWidth = Math.round(size * 0.20);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  // Pass 6° gap per spec
  const computed = computeDonutSegments(segments, strokeWidth, radius, chartPalette, 6);

  const displayAmount = centerAmount || (total > 0 ? formatRupees(total) : '₹0');

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.chartTrack}
          strokeWidth={strokeWidth}
        />

        {/* Segments (clockwise starting at 12 o'clock) */}
        {computed.length === 0 ? null : (
          <G rotation={-90} origin={`${center},${center}`}>
            {computed.map((seg) => (
              <Circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLen} ${seg.gapLen}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                rotation={seg.rotate}
                origin={`${center},${center}`}
              />
            ))}
          </G>
        )}

        {/* Centre Title: 13px textMuted */}
        <SvgText
          x={center}
          y={center - 14}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize={13}
          fontFamily={typography.bodyMedium}
        >
          {centerTitle}
        </SvgText>

        {/* Centre Amount: 32px bold white */}
        <SvgText
          x={center}
          y={center + 20}
          textAnchor="middle"
          fill={colors.white}
          fontSize={size < 180 ? 24 : 32}
          fontWeight="700"
          fontFamily={typography.bodyBold}
        >
          {displayAmount}
        </SvgText>
      </Svg>

      {/* 3-column Legend */}
      {showLegend && computed.length > 0 && (
        <View style={styles.legendGrid}>
          {computed.map((seg) => (
            <View key={seg.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendLabel, { color: colors.white }]} numberOfLines={1}>
                {seg.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
  },
  legendGrid: {
    width: '100%',
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: spacing.sm,
  },
  legendItem: {
    width: '33.33%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    fontFamily: typography.body,
    fontSize: 13,
    flex: 1,
  },
});
