import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore, InsightsData } from '../src/state/useAppStore';
import { formatRupees } from '../src/domain/money';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';

const SCREEN_WIDTH = Dimensions.get('window').width;

function InsightsContent() {
  const { getInsightsData, bannerMessage, groupedTransactions } = useAppStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getInsightsData(period)
      .then((result) => {
        if (active) {
          setData(result);
          setSelectedBarIndex(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load insights:', err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [period, getInsightsData, groupedTransactions]);

  const handlePeriodChange = (newPeriod: 'week' | 'month') => {
    if (newPeriod === period) return;
    Haptics.selectionAsync().catch(() => {});
    setLoading(true);
    setPeriod(newPeriod);
  };

  const handleBarPress = (index: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedBarIndex(selectedBarIndex === index ? null : index);
  };

  const chartWidth = Math.min(SCREEN_WIDTH - spacing.lg * 2 - 32, 340);
  const chartHeight = 160;
  const paddingBottom = 26;
  const paddingTop = 20;
  const availableHeight = chartHeight - paddingBottom - paddingTop;

  const maxBarAmount = data?.dailyBars
    ? Math.max(...data.dailyBars.map((b) => b.amountPaise), 100)
    : 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {bannerMessage && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Insights 📊</Text>
            <Text style={styles.subtitle}>Spending patterns & trends</Text>
          </View>

          {/* Week / Month Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, period === 'week' && styles.toggleBtnActive]}
              onPress={() => handlePeriodChange('week')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleText, period === 'week' && styles.toggleTextActive]}
              >
                Week
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, period === 'month' && styles.toggleBtnActive]}
              onPress={() => handlePeriodChange('month')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleText, period === 'month' && styles.toggleTextActive]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Analyzing expenses...</Text>
          </View>
        ) : !data || data.totalExpensePaise === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🍃</Text>
            <Text style={styles.emptyTitle}>No expenses for this {period}</Text>
            <Text style={styles.emptyDesc}>
              Log transactions with your voice on Home to view spending charts, category
              breakdowns, and trends here.
            </Text>
          </View>
        ) : (
          <>
            {/* Total Spent in Period Card */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                {period === 'week' ? 'Past 7 Days Total' : 'This Month Total'}
              </Text>
              <Text style={styles.totalAmount}>
                {formatRupees(data.totalExpensePaise)}
              </Text>
              <View style={styles.totalMetaRow}>
                <Text style={styles.totalMeta}>
                  {data.dailyBars.filter((b) => b.amountPaise > 0).length} active spend days
                </Text>
                {data.totalIncomePaise > 0 && (
                  <Text style={styles.totalIncomeMeta}>
                    +{formatRupees(data.totalIncomePaise)} income
                  </Text>
                )}
              </View>
            </View>

            {/* SVG Daily Bar Chart Card */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Daily Spending</Text>
                {selectedBarIndex !== null && data.dailyBars[selectedBarIndex] && (
                  <View style={styles.tooltipBadge}>
                    <Text style={styles.tooltipText}>
                      {data.dailyBars[selectedBarIndex].date}:{' '}
                      {formatRupees(data.dailyBars[selectedBarIndex].amountPaise)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.svgWrap}>
                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                      <Stop offset="100%" stopColor="#1B3E9E" stopOpacity="0.8" />
                    </LinearGradient>
                    <LinearGradient id="activeBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#6C97FF" stopOpacity="1" />
                      <Stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
                    </LinearGradient>
                  </Defs>

                  {/* Baseline grid line */}
                  <Line
                    x1="0"
                    y1={chartHeight - paddingBottom}
                    x2={chartWidth}
                    y2={chartHeight - paddingBottom}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                  />

                  {/* Bars */}
                  {data.dailyBars.map((bar, idx) => {
                    const totalBars = data.dailyBars.length;
                    const barSlotWidth = chartWidth / totalBars;
                    const barWidth = Math.max(Math.min(barSlotWidth * 0.65, 28), 6);
                    const x = idx * barSlotWidth + (barSlotWidth - barWidth) / 2;

                    const barHeight =
                      bar.amountPaise > 0
                        ? Math.max((bar.amountPaise / maxBarAmount) * availableHeight, 4)
                        : 2;

                    const y = chartHeight - paddingBottom - barHeight;
                    const isSelected = selectedBarIndex === idx;

                    return (
                      <React.Fragment key={bar.date}>
                        {/* Interactive Bar */}
                        <Rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={Math.min(barWidth / 2, 4)}
                          ry={Math.min(barWidth / 2, 4)}
                          fill={
                            isSelected
                              ? 'url(#activeBarGradient)'
                              : bar.amountPaise > 0
                              ? 'url(#barGradient)'
                              : 'rgba(255, 255, 255, 0.08)'
                          }
                          onPress={() => handleBarPress(idx)}
                        />

                        {/* Label below bar */}
                        {(period === 'week' || idx % 5 === 0 || idx === totalBars - 1) && (
                          <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight - 6}
                            fill={isSelected ? colors.text : colors.muted}
                            fontSize={totalBars > 15 ? "9" : "11"}
                            fontWeight={isSelected ? 'bold' : 'normal'}
                            textAnchor="middle"
                          >
                            {bar.label}
                          </SvgText>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Svg>
              </View>
              <Text style={styles.chartHint}>Tap any bar to see day&apos;s total</Text>
            </View>

            {/* Metrics Row: Average Per Day & Biggest Expense */}
            <View style={styles.metricsRow}>
              {/* Average Per Day Card */}
              <View style={[styles.metricCard, { marginRight: spacing.sm }]}>
                <Text style={styles.metricLabel}>Daily Average</Text>
                <Text style={styles.metricValue}>
                  {formatRupees(data.avgPerDayPaise)}
                </Text>
                <Text style={styles.metricSub}>
                  {period === 'week' ? 'Past 7 days' : 'Current month to date'}
                </Text>
              </View>

              {/* Biggest Expense Card */}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Biggest Expense</Text>
                {data.biggestExpense ? (
                  <>
                    <Text style={styles.metricValue} numberOfLines={1}>
                      {formatRupees(data.biggestExpense.amountPaise)}
                    </Text>
                    <Text style={styles.metricSub} numberOfLines={1}>
                      {data.biggestExpense.emoji} {data.biggestExpense.note}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.metricValue}>₹0</Text>
                    <Text style={styles.metricSub}>None</Text>
                  </>
                )}
              </View>
            </View>

            {/* Top Categories Breakdown */}
            <View style={styles.categoriesCard}>
              <Text style={styles.cardSectionTitle}>Top Categories</Text>

              {data.categoryBreakdown.length === 0 ? (
                <Text style={styles.emptyCatText}>No category expenses recorded.</Text>
              ) : (
                data.categoryBreakdown.map((cat) => (
                  <View key={cat.categoryId} style={styles.catRow}>
                    <View style={styles.catTopLine}>
                      <View style={styles.catNameWrap}>
                        <Text style={styles.catEmoji}>{cat.emoji || '✨'}</Text>
                        <Text style={styles.catName}>{cat.name}</Text>
                      </View>
                      <View style={styles.catAmountWrap}>
                        <Text style={styles.catAmount}>{formatRupees(cat.amountPaise)}</Text>
                        <Text style={styles.catPercent}>{cat.percentage}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(Math.max(cat.percentage, 4), 100)}%`,
                            backgroundColor: cat.color || colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InsightsScreen() {
  return (
    <ErrorBoundary fallbackTitle="Insights unavailable">
      <InsightsContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  banner: {
    position: 'absolute',
    top: 20,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.round,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.round,
    minHeight: 36,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    fontFamily: typography.displaySerif,
    marginVertical: spacing.xs,
  },
  totalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  totalMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  totalIncomeMeta: {
    color: colors.income,
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 28,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  tooltipBadge: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tooltipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  chartHint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.displaySerif,
    marginVertical: 4,
  },
  metricSub: {
    color: colors.muted,
    fontSize: 11,
  },
  categoriesCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  emptyCatText: {
    color: colors.muted,
    fontSize: 13,
  },
  catRow: {
    marginBottom: spacing.md,
  },
  catTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catEmoji: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  catName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  catAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  catPercent: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.elevated,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.round,
  },
});
