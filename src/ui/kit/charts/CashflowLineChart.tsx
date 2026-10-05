/**
 * CashflowLineChart — pure SVG cashflow/balance over time.
 * Where it fits: Home balance history widget, Reports cashflow view.
 *
 * Implements WINI_DESIGN_SPEC.md D3:
 * - 2px line, filled endpoint dot
 * - Soft gradient area below line
 * - Dashed projection segment (future / estimated)
 * - Day tick marks on X axis
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Polyline,
  Polygon,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { typography, spacing } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import { mapToPoints as _mapToPoints } from './chartGeometry';

export interface LineDataPoint {
  key: string;
  label: string;
  /** amount in paise (balance / net) */
  amountPaise: number;
  /** if true, rendered as dashed projection */
  projected?: boolean;
}

export interface CashflowLineChartProps {
  data: LineDataPoint[];
  width?: number;
  height?: number;
  showAreaFill?: boolean;
  showDots?: boolean;
}

/** Re-export for backward compat */
export { mapToPoints as mapToPointsGeometry } from './chartGeometry';

export const CashflowLineChart: React.FC<CashflowLineChartProps> = ({
  data,
  width = 320,
  height = 160,
  showAreaFill = true,
  showDots = true,
}) => {
  const { colors } = useTheme();

  const padX = 12;
  const padY = 24;

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data</Text>
      </View>
    );
  }

  const points = _mapToPoints(data, width, height - 20, padX, padY);

  // Split into solid and projected segments
  const solidPoints = points.filter((p) => !p.projected);
  const projectionStart = solidPoints.length > 0 ? solidPoints[solidPoints.length - 1] : null;
  const projectedPoints = points.filter((p) => p.projected);

  const toPolylinePoints = (pts: typeof points) =>
    pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Build closed polygon for area fill (solid segment only)
  const areaPoints =
    solidPoints.length > 1
      ? [
          ...solidPoints,
          { x: solidPoints[solidPoints.length - 1].x, y: height - 20 - padY },
          { x: solidPoints[0].x, y: height - 20 - padY },
        ]
            .map((p) => `${p.x},${p.y}`)
            .join(' ')
      : '';

  const lastPoint = points[points.length - 1];
  const lastSolid = solidPoints.length > 0 ? solidPoints[solidPoints.length - 1] : lastPoint;

  return (
    <View style={{ width }}>
      <Svg width={width} height={height - 20}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.chartLine} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={colors.chartLine} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        {showAreaFill && areaPoints ? (
          <Polygon points={areaPoints} fill="url(#areaGrad)" />
        ) : null}

        {/* Solid line */}
        {solidPoints.length > 1 ? (
          <Polyline
            points={toPolylinePoints(solidPoints)}
            fill="none"
            stroke={colors.chartLine}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Dashed projection */}
        {projectedPoints.length > 1 && projectionStart ? (
          <Polyline
            points={toPolylinePoints([projectionStart, ...projectedPoints])}
            fill="none"
            stroke={colors.chartLine}
            strokeWidth={2}
            strokeDasharray="5,4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        ) : null}

        {/* Day tick marks on X axis */}
        {points.map((p, i) => (
          <Line
            key={`tick-${i}`}
            x1={p.x}
            y1={height - 20 - padY + 4}
            x2={p.x}
            y2={height - 20 - padY + 8}
            stroke={colors.chartTrack}
            strokeWidth={1}
          />
        ))}

        {/* All dots (if enabled) */}
        {showDots &&
          points.map((p, i) => (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3}
              fill={i === points.length - 1 ? colors.chartLine : colors.chartTrack}
              stroke={i === points.length - 1 ? colors.bg : 'none'}
              strokeWidth={i === points.length - 1 ? 2 : 0}
            />
          ))}

        {/* End value label */}
        <SvgText
          x={lastSolid.x}
          y={lastSolid.y - 10}
          textAnchor="middle"
          fill={colors.text}
          fontSize={10}
          fontFamily={typography.bodyBold}
        >
          {formatRupees(lastSolid.amountPaise)}
        </SvgText>
      </Svg>

      {/* X-axis labels */}
      <View style={[styles.labels, { width }]}>
        {points
          .filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1)
          .map((p, i) => (
            <Text
              key={i}
              style={[styles.labelText, { color: colors.textMuted, left: p.x - 20, width: 40 }]}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
  },
  labels: {
    height: 20,
    position: 'relative',
  },
  labelText: {
    position: 'absolute',
    fontFamily: typography.body,
    fontSize: 10,
    textAlign: 'center',
  },
});
