/**
 * BarChart — pure SVG weekly/monthly bar chart.
 * Where it fits: Reports & Home weekly spending overview.
 *
 * Implements WINI_DESIGN_SPEC.md D3:
 * - Rounded-top bars, unselected track colour
 * - Highlighted bar with gradient fill
 * - Floating value tooltip on selected bar
 * - Day / period labels below
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { typography, spacing, radii } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import { computeBars as _computeBars } from './chartGeometry';

export interface BarDataPoint {
  key: string;
  label: string;
  amountPaise: number;
}

export interface BarChartProps {
  data: BarDataPoint[];
  width?: number;
  height?: number;
  barRadius?: number;
  /** index of the bar to pre-select */
  initialSelectedIndex?: number;
}

/** Re-export for backward compat */
export { computeBars as computeBarsGeometry } from './chartGeometry';

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 320,
  height = 160,
  barRadius = 6,
  initialSelectedIndex,
}) => {
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(
    initialSelectedIndex ?? (data.length > 0 ? data.length - 1 : 0),
  );

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data</Text>
      </View>
    );
  }

  const gap = 8;
  const bars = _computeBars(data, width, height - 24, barRadius, gap); // leave 24px for labels

  return (
    <View style={{ width }}>
      <Svg width={width} height={height - 24}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={1} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.55} />
          </LinearGradient>
        </Defs>

        {bars.map((b) => {
          const isSelected = b.index === selectedIndex;
          return (
            <Rect
              key={b.key}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={barRadius}
              ry={barRadius}
              fill={isSelected ? 'url(#barGrad)' : colors.chartTrack}
              onPress={() => setSelectedIndex(b.index)}
            />
          );
        })}

        {/* Floating tooltip on selected bar */}
        {bars.map((b) => {
          if (b.index !== selectedIndex) return null;
          const tipY = b.y - 20;
          return (
            <SvgText
              key={`tip-${b.key}`}
              x={b.x + b.w / 2}
              y={tipY}
              textAnchor="middle"
              fill={colors.accent}
              fontSize={10}
              fontFamily={typography.bodyBold}
            >
              {formatRupees(b.amountPaise)}
            </SvgText>
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View style={[styles.labels, { width }]}>
        {bars.map((b) => (
          <TouchableWithoutFeedback key={b.key} onPress={() => setSelectedIndex(b.index)}>
            <View style={[styles.labelCell, { width: b.w, marginLeft: gap }]}>
              <Text
                style={[
                  styles.labelText,
                  {
                    color: b.index === selectedIndex ? colors.text : colors.textMuted,
                    fontFamily:
                      b.index === selectedIndex ? typography.bodyBold : typography.body,
                  },
                ]}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            </View>
          </TouchableWithoutFeedback>
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
    flexDirection: 'row',
    marginTop: 2,
  },
  labelCell: {
    alignItems: 'center',
  },
  labelText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
