/**
 * SemicircleGauge — pure SVG half-circle spending gauge.
 * Where it fits: Home budget gauge widget, Reports budget vs actual.
 *
 * Implements WINI_DESIGN_SPEC.md D3:
 * - 3-4 coloured arcs with rounded ends
 * - Centre shows total amount and label
 * - Works in Night and Pocket themes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { categoryColors, typography, spacing } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import {
  computeGaugeSegments as _computeGaugeSegments,
  polarToCartesian as _polarToCartesian,
  semicircleArcPath as _semicircleArcPath,
} from './chartGeometry';

export interface GaugeSegment {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export interface SemicircleGaugeProps {
  segments: GaugeSegment[];
  size?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

/** Re-export geometry helpers for backward compat */
export { polarToCartesian, semicircleArcPath, computeGaugeSegments as computeGaugeSegmentsGeometry } from './chartGeometry';

export const SemicircleGauge: React.FC<SemicircleGaugeProps> = ({
  segments,
  size = 220,
  centerLabel,
  centerSubLabel,
}) => {
  const { colors } = useTheme();

  const svgHeight = size / 2 + 32; // semicircle + breathing room
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = Math.round(size * 0.085);
  const r = (size - strokeWidth * 2) / 2;

  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  const computed = _computeGaugeSegments(segments, cx, cy, r, Object.values(categoryColors));
  const displayCenter = centerLabel || (total > 0 ? formatRupees(total) : '₹0');

  // Track arc (full semicircle)
  const trackPath = _semicircleArcPath(cx, cy, r, 0, 179.9);

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={svgHeight}>
        {/* Track */}
        <Path
          d={trackPath}
          fill="none"
          stroke={colors.chartTrack}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Segments */}
        {computed.map((seg) => (
          <Path
            key={seg.key}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}

        {/* Centre label */}
        <SvgText
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={colors.text}
          fontSize={size < 180 ? 14 : 18}
          fontFamily={typography.bodyBold}
        >
          {displayCenter}
        </SvgText>
        {centerSubLabel ? (
          <SvgText
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            fill={colors.textMuted}
            fontSize={11}
            fontFamily={typography.body}
          >
            {centerSubLabel}
          </SvgText>
        ) : null}
      </Svg>

      {/* Segment legend */}
      {computed.length > 0 && (
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
    marginTop: spacing.sm,
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
