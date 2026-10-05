/**
 * DonutChart — pure SVG, no Reanimated.
 * Where it fits: Reports screen category breakdown, home hero widget.
 *
 * Implements WINI_DESIGN_SPEC.md D3:
 * - Thick stroke (≈18% of diameter), rounded caps, gaps between segments
 * - Center label (total or custom)
 * - Category colours from tokens, legend with amount
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { categoryColors, typography, spacing } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import { computeDonutSegments as _computeDonutSegments } from './chartGeometry';

export interface DonutSegment {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  /** override centre label (default: total amount) */
  centerLabel?: string;
  centerSubLabel?: string;
  showLegend?: boolean;
}

/** Re-export for backward compat / direct use */
export { computeDonutSegments as computeDonutSegmentsGeometry } from './chartGeometry';

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 200,
  centerLabel,
  centerSubLabel,
  showLegend = true,
}) => {
  const { colors } = useTheme();

  const strokeWidth = Math.round(size * 0.09); // ~9% each side = ~18% diameter
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  const computed = _computeDonutSegments(segments, strokeWidth, radius, Object.values(categoryColors));

  const displayCenter = centerLabel || (total > 0 ? formatRupees(total) : '₹0');

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.chartTrack}
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
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
        {/* Centre Label */}
        <SvgText
          x={center}
          y={center - 6}
          textAnchor="middle"
          fill={colors.text}
          fontSize={size < 160 ? 14 : 18}
          fontFamily={typography.bodyBold}
        >
          {displayCenter}
        </SvgText>
        {centerSubLabel ? (
          <SvgText
            x={center}
            y={center + 14}
            textAnchor="middle"
            fill={colors.textMuted}
            fontSize={11}
            fontFamily={typography.body}
          >
            {centerSubLabel}
          </SvgText>
        ) : null}
      </Svg>

      {/* Legend */}
      {showLegend && computed.length > 0 && (
        <View style={styles.legend}>
          {computed.map((seg) => (
            <View key={seg.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendLabel, { color: colors.text }]} numberOfLines={1}>
                {seg.label}
              </Text>
              <Text style={[styles.legendAmt, { color: colors.textMuted }]}>
                {Math.round(seg.pct * 100)}%
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
  },
  legend: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
  },
  legendAmt: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
  },
});
