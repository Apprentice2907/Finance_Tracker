/**
 * BarChart component for Wini.
 * Where it fits: Used on Home cashflow card and Reports screen.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.2:
 * - Equal-width thick bars (80% slot, 20% gap)
 * - Corner radius 9px on top and bottom
 * - Plot height ~190px, tallest bar reaches ~90%, 0-value shows 6px stub
 * - Unselected bars: chartTrack (#38383C)
 * - Selected bar: Vertical gradient #DCE4FF (top) → #7E96FF (middle) → #5B5BF0 (bottom)
 * - Tooltip: White rounded rectangle (radius 10, padding 6×10, black semibold 13px text, no arrow) centered 8px above selected bar, clamped to bounds
 * - Day/week labels under bars (12px textMuted; selected label turns white)
 * - Tap to select with haptic tick
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { typography, barSelectedGradient } from '../../tokens';
import { useTheme } from '../../ThemeContext';
import { formatRupees } from '../../../domain/money';
import { computeBars, clampTooltipX } from './chartGeometry';

export interface BarDataPoint {
  key: string;
  label: string;
  amountPaise: number;
}

export interface BarChartProps {
  data: BarDataPoint[];
  width?: number;
  height?: number;
  plotHeight?: number;
  barRadius?: number;
  initialSelectedIndex?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

/** Re-export for backward compat / unit tests */
export { computeBars as computeBarsGeometry } from './chartGeometry';

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 320,
  height,
  plotHeight = height ?? 190,
  barRadius = 9,
  initialSelectedIndex,
  selectedIndex: controlledSelectedIndex,
  onSelectIndex,
}) => {
  const { colors } = useTheme();
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(
    initialSelectedIndex ?? (data.length > 0 ? data.length - 1 : 0),
  );

  const selectedIndex = controlledSelectedIndex !== undefined
    ? controlledSelectedIndex
    : internalSelectedIndex;

  const handleSelect = (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics unavailable on web/sim
    }
    setInternalSelectedIndex(index);
    onSelectIndex?.(index);
  };

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { width, height: plotHeight }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions</Text>
      </View>
    );
  }

  // Compute bar geometry (80% bar, 20% gap, 9px radius, 90% max height, 6px 0-stub)
  const bars = computeBars(data, width, plotHeight, barRadius, 0.8, 0.9, 6);

  // Tooltip dimensions
  const tooltipHeight = 28;
  const tooltipWidth = 76;
  const tooltipRadius = 10;

  const selectedBar = bars[selectedIndex] || bars[bars.length - 1];

  // Tooltip position: centered 8px above the bar, clamped
  let tooltipCenterX = selectedBar ? selectedBar.x + selectedBar.w / 2 : width / 2;
  tooltipCenterX = clampTooltipX(tooltipCenterX, tooltipWidth, width, 6);
  const tooltipY = selectedBar ? Math.max(4, selectedBar.y - tooltipHeight - 8) : 4;

  return (
    <View style={{ width }}>
      <Svg width={width} height={plotHeight + 8}>
        <Defs>
          <LinearGradient id="selectedBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={barSelectedGradient[0]} stopOpacity={1} />
            <Stop offset="50%" stopColor={barSelectedGradient[1]} stopOpacity={1} />
            <Stop offset="100%" stopColor={barSelectedGradient[2]} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        {/* Bars */}
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
              fill={isSelected ? 'url(#selectedBarGrad)' : colors.chartTrack}
              onPress={() => handleSelect(b.index)}
            />
          );
        })}

        {/* Floating Tooltip on selected bar: white rounded rect, radius 10, black semibold 13px text */}
        {selectedBar ? (
          <G x={tooltipCenterX - tooltipWidth / 2} y={tooltipY}>
            <Rect
              x={0}
              y={0}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={tooltipRadius}
              ry={tooltipRadius}
              fill={colors.white}
            />
            <SvgText
              x={tooltipWidth / 2}
              y={tooltipHeight / 2 + 4.5}
              textAnchor="middle"
              fill={colors.black}
              fontSize={13}
              fontWeight="600"
              fontFamily={typography.bodySemiBold}
            >

              {formatRupees(selectedBar.amountPaise)}
            </SvgText>
          </G>
        ) : null}
      </Svg>

      {/* X-axis labels under the bars */}
      <View style={[styles.labelsRow, { width }]}>
        {bars.map((b) => {
          const isSelected = b.index === selectedIndex;
          return (
            <TouchableWithoutFeedback key={b.key} onPress={() => handleSelect(b.index)}>
              <View
                style={[
                  styles.labelCell,
                  {
                    left: b.x,
                    width: b.w,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.labelText,
                    {
                      color: isSelected ? colors.white : colors.textMuted,
                      fontFamily: isSelected ? typography.bodySemiBold : typography.body,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {b.label}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
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
  labelsRow: {
    height: 24,
    position: 'relative',
    marginTop: 6,
  },
  labelCell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
