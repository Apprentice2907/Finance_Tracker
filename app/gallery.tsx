/**
 * Component Gallery (Developer Screen).
 * Where it fits: Reachable from Settings → Developer (`/gallery`).
 *
 * Demonstrates all shared UI kit components (D1 + D2) in both Night & Pocket themes,
 * and all relevant states: default, pressed, disabled, loading, empty, error.
 *
 * Theme switcher at the top overrides the global theme only within this screen
 * so the developer can compare both themes without leaving the gallery.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Button,
  Chip,
  ListRow,
  SectionHeader,
  AmountText,
  BottomSheet,
  EmptyState,
  ErrorBanner,
  Skeleton,
  SegmentedControl,
  IconButton,
  TexturedCard,
  CategoryIcon,
  CategoryTile,
  TransactionRow,
  GlassButton,
  Keypad,
  FloatingNav,
  DonutChart,
  BarChart,
  CashflowLineChart,
  SemicircleGauge,
  type NavTabKey,
} from '../src/ui/kit';
import { nightColors, pocketColors, categoryColors, spacing, typography, radii } from '../src/ui/tokens';
import { useTheme } from '../src/ui/ThemeContext';
import {
  WalletIcon,
  MicIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ChartIcon,
  SettingsIcon,
} from '../src/ui/icons';

// ──────────────────────────────────────────────────────────────
// Gallery inner component (receives overridden colors)
// ──────────────────────────────────────────────────────────────
function GalleryContent({ localTheme }: { localTheme: 'night' | 'pocket' }) {
  const isDark = localTheme === 'night';
  const C = isDark ? nightColors : pocketColors;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('month');
  const [selectedSegment2, setSelectedSegment2] = useState('expense');
  const [chipSelected, setChipSelected] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<NavTabKey>('home');

  // ── styles scoped to current localTheme ──────────────────────
  const dyn = StyleSheet.create({
    sectionBg: {
      backgroundColor: C.bg,
    },
    sectionTitle: {
      color: C.text,
      fontFamily: typography.bodyBold,
      fontSize: typography.sizeLg,
      marginBottom: 2,
    },
    sectionSub: {
      color: C.textMuted,
      fontFamily: typography.body,
      fontSize: typography.sizeXs,
    },
    stateLabel: {
      color: C.textMuted,
      fontFamily: typography.bodyMedium,
      fontSize: typography.sizeXs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
      marginVertical: spacing.md,
    },
    cardTitle: {
      color: C.text,
      fontFamily: typography.bodyBold,
      fontSize: typography.sizeBase,
      marginBottom: 4,
    },
    cardBody: {
      color: C.textMuted,
      fontFamily: typography.body,
      fontSize: typography.sizeSm,
    },
    sheetText: {
      color: C.textSecondary,
      fontFamily: typography.body,
      fontSize: typography.sizeBase,
      lineHeight: typography.lineHeightBase,
    },
    keypadValue: {
      color: C.text,
      fontFamily: typography.bodyBold,
      fontSize: typography.sizeXxl,
      textAlign: 'center',
      minHeight: 40,
      marginBottom: spacing.md,
    },
    listEmoji: {
      fontSize: 24,
    },
    colorName: {
      color: C.textMuted,
      fontFamily: typography.bodyMedium,
      fontSize: typography.sizeXs,
    },
    iconLabel: {
      color: C.textMuted,
      fontFamily: typography.body,
      fontSize: typography.sizeXs,
    },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 0. Device Info ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Device Info & Safe Areas</Text>
        <Text style={dyn.sectionSub}>Screen dimensions, font scaling and safe insets</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Text style={dyn.cardTitle}>Layout Diagnostics</Text>
        <Text style={dyn.cardBody}>Window: {Math.round(width)} × {Math.round(height)} dp</Text>
        <Text style={dyn.cardBody}>Font Scale: {fontScale.toFixed(2)}x</Text>
        <Text style={dyn.cardBody}>
          Safe Insets: Top {Math.round(insets.top)}px · Bottom {Math.round(insets.bottom)}px · Left {Math.round(insets.left)}px · Right {Math.round(insets.right)}px
        </Text>
      </Card>

      {/* ── 1. Colour Palette ───────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Design Tokens: Colors</Text>
        <Text style={dyn.sectionSub}>Semantic palette for the active theme</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[
            { label: 'Accent', val: C.accent },
            { label: 'Income', val: C.income },
            { label: 'Expense', val: C.expense },
            { label: 'Danger', val: C.danger },
            { label: 'Warning', val: C.warning },
            { label: 'Purple', val: C.accentPurple },
            { label: 'Surface', val: C.surface },
            { label: 'Surface2', val: C.surface2 },
          ].map((c) => (
            <View key={c.label} style={{ alignItems: 'center', width: 72 }}>
              <View style={{ width: 44, height: 44, borderRadius: radii.md, marginBottom: 4, borderWidth: 1, borderColor: C.border, backgroundColor: c.val }} />
              <Text style={dyn.colorName}>{c.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ── 2. AmountText ────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>AmountText</Text>
        <Text style={dyn.sectionSub}>Indian grouping, dimmed decimals, sign, serif in Pocket</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={dyn.stateLabel}>Income</Text>
            <AmountText amountPaise={12500000} type="income" showSign size="xl" />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={dyn.stateLabel}>Expense</Text>
            <AmountText amountPaise={45000} type="expense" showSign size="xl" />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={dyn.stateLabel}>Neutral</Text>
            <AmountText amountPaise={250000} type="neutral" size="xl" />
          </View>
        </View>
        <View style={dyn.divider} />
        <Text style={dyn.stateLabel}>Hero Display</Text>
        <AmountText amountPaise={150000000} type="income" showSign size="hero" />
      </Card>

      {/* ── 3. Buttons ───────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Button</Text>
        <Text style={dyn.sectionSub}>primary · secondary · ghost · danger · sm/md/lg · loading</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Text style={dyn.stateLabel}>Variants</Text>
        <View style={{ gap: spacing.sm }}>
          <Button title="Primary Action" variant="primary" onPress={() => {}} icon={<PlusIcon size={16} color={C.onAccent} />} />
          <Button title="Secondary Action" variant="secondary" onPress={() => {}} icon={<SettingsIcon size={16} color={C.text} />} />
          <Button title="Danger Action" variant="danger" onPress={() => {}} icon={<TrashIcon size={16} color={C.white} />} />
          <Button title="Ghost Action" variant="ghost" onPress={() => {}} />
        </View>
        <View style={dyn.divider} />
        <Text style={dyn.stateLabel}>Disabled & Loading</Text>
        <View style={{ gap: spacing.sm }}>
          <Button title="Disabled Primary" variant="primary" disabled onPress={() => {}} />
          <Button
            title={buttonLoading ? 'Loading…' : 'Tap for Loading State'}
            variant="secondary"
            loading={buttonLoading}
            onPress={() => { setButtonLoading(true); setTimeout(() => setButtonLoading(false), 2000); }}
          />
        </View>
        <View style={dyn.divider} />
        <Text style={dyn.stateLabel}>Sizes</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Button title="Small" size="sm" variant="secondary" onPress={() => {}} />
          <Button title="Medium" size="md" variant="secondary" onPress={() => {}} />
          <Button title="Large" size="lg" variant="primary" onPress={() => {}} />
        </View>
      </Card>

      {/* ── 4. GlassButton ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>GlassButton</Text>
        <Text style={dyn.sectionSub}>Quick-action tiles: icon above label, glass hairline border</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <GlassButton label="Speak" icon={<Ionicons name="mic" size={22} color={C.text} />} onPress={() => {}} />
          <GlassButton label="Type" icon={<Ionicons name="keypad" size={22} color={C.text} />} onPress={() => {}} />
          <GlassButton label="Income" icon={<Ionicons name="trending-up" size={22} color={C.income} />} onPress={() => {}} />
          <GlassButton label="More" icon={<Ionicons name="ellipsis-horizontal" size={22} color={C.textMuted} />} onPress={() => {}} />
        </View>
      </Card>

      {/* ── 5. Cards & TexturedCard ───────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Card & TexturedCard</Text>
        <Text style={dyn.sectionSub}>surface · elevated · glass · outlined · 5 textures</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md }}>
        <Card variant="surface" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          <Text style={dyn.cardTitle}>Surface Card</Text>
          <Text style={dyn.cardBody}>Standard base card with subtle border.</Text>
        </Card>
        <Card variant="elevated" style={{ backgroundColor: C.surface2, borderColor: C.border }}>
          <Text style={dyn.cardTitle}>Elevated Card</Text>
          <Text style={dyn.cardBody}>Higher contrast, second-level container.</Text>
        </Card>
        <Card variant="glass" style={{ backgroundColor: C.glassFill, borderColor: C.glassBorder }}>
          <Text style={dyn.cardTitle}>Glass Card</Text>
          <Text style={dyn.cardBody}>Translucent frosted glass styling.</Text>
        </Card>
        <Card variant="outlined" onPress={() => {}} style={{ borderColor: C.border }}>
          <Text style={dyn.cardTitle}>Outlined Clickable (Tap me)</Text>
          <Text style={dyn.cardBody}>Transparent background with touch opacity.</Text>
        </Card>

        {/* TexturedCard: all 5 textures */}
        <Text style={[dyn.stateLabel, { marginTop: spacing.sm }]}>TexturedCard — 5 Textures</Text>
        {(['aurora', 'nebula', 'cosmos', 'ember', 'midnight'] as const).map((tex) => (
          <TexturedCard key={tex} texture={tex} style={{ marginBottom: spacing.xs }}>
            <Text style={{ color: C.white, fontFamily: typography.bodyBold, fontSize: typography.sizeBase }}>{tex.charAt(0).toUpperCase() + tex.slice(1)}</Text>
            <AmountText amountPaise={100000} type="income" showSign size="xl" />
          </TexturedCard>
        ))}
      </View>

      {/* ── 6. SegmentedControl ──────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>SegmentedControl</Text>
        <Text style={dyn.sectionSub}>Period selector, type selector</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Text style={[dyn.stateLabel, { marginBottom: spacing.sm }]}>Period</Text>
        <SegmentedControl
          options={[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'quarter', label: 'Quarter' },
            { key: 'year', label: 'Year' },
          ]}
          selectedKey={selectedSegment}
          onChange={setSelectedSegment}
        />
        <View style={{ height: spacing.md }} />
        <Text style={[dyn.stateLabel, { marginBottom: spacing.sm }]}>Type</Text>
        <SegmentedControl
          options={[
            { key: 'expense', label: 'Expense' },
            { key: 'income', label: 'Income' },
          ]}
          selectedKey={selectedSegment2}
          onChange={setSelectedSegment2}
        />
      </Card>

      {/* ── 7. IconButton ────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>IconButton</Text>
        <Text style={dyn.sectionSub}>primary · surface · glass · danger · disabled</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { label: 'Primary', el: <IconButton icon={<MicIcon size={20} color={C.white} />} variant="primary" onPress={() => {}} /> },
            { label: 'Surface', el: <IconButton icon={<SearchIcon size={20} color={C.text} />} variant="surface" onPress={() => {}} /> },
            { label: 'Glass', el: <IconButton icon={<WalletIcon size={20} color={C.accentPurple} />} variant="glass" onPress={() => {}} /> },
            { label: 'Danger', el: <IconButton icon={<TrashIcon size={20} color={C.white} />} variant="danger" onPress={() => {}} /> },
            { label: 'Disabled', el: <IconButton icon={<MicIcon size={20} color={C.white} />} variant="primary" disabled onPress={() => {}} /> },
          ].map(({ label, el }) => (
            <View key={label} style={{ alignItems: 'center', gap: spacing.xs }}>
              {el}
              <Text style={dyn.iconLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ── 8. CategoryIcon ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>CategoryIcon</Text>
        <Text style={dyn.sectionSub}>Squircle: Night=filled+dark glyph · Pocket=14% tint+colored glyph</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {[
            { name: 'food', color: categoryColors.orange },
            { name: 'transport', color: categoryColors.blue },
            { name: 'shopping', color: categoryColors.violet },
            { name: 'bills', color: categoryColors.cyan },
            { name: 'health', color: categoryColors.coral },
            { name: 'fun', color: categoryColors.mint },
            { name: 'education', color: categoryColors.yellow },
            { name: 'salary', color: categoryColors.lime },
            { name: 'income', color: categoryColors.teal },
            { name: 'other', color: categoryColors.grey },
          ].map(({ name, color }) => (
            <View key={name} style={{ alignItems: 'center', gap: 4 }}>
              <CategoryIcon name={name} color={color} size="md" />
              <Text style={[dyn.colorName, { width: 52, textAlign: 'center' }]}>{name}</Text>
            </View>
          ))}
        </View>
        <View style={dyn.divider} />
        <Text style={dyn.stateLabel}>Sizes: sm · md · lg</Text>
        <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-end' }}>
          <CategoryIcon name="food" color={categoryColors.orange} size="sm" />
          <CategoryIcon name="food" color={categoryColors.orange} size="md" />
          <CategoryIcon name="food" color={categoryColors.orange} size="lg" />
        </View>
      </Card>

      {/* ── 9. CategoryTile ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>CategoryTile</Text>
        <Text style={dyn.sectionSub}>2-column grid tile — icon, name, amount, badge</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <CategoryTile
          name="Food"
          iconName="food"
          color={categoryColors.orange}
          amountPaise={358000}
          count={12}
          percentage={34}
          style={{ flex: 1 }}
        />
        <CategoryTile
          name="Transport"
          iconName="transport"
          color={categoryColors.blue}
          amountPaise={124000}
          count={8}
          percentage={12}
          style={{ flex: 1 }}
        />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <CategoryTile
          name="Shopping"
          iconName="shopping"
          color={categoryColors.violet}
          amountPaise={287000}
          count={5}
          style={{ flex: 1 }}
        />
        <CategoryTile
          name="Bills"
          iconName="bills"
          color={categoryColors.cyan}
          amountPaise={195000}
          count={3}
          style={{ flex: 1 }}
        />
      </View>

      {/* ── 10. TransactionRow ───────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>TransactionRow</Text>
        <Text style={dyn.sectionSub}>Squircle icon · title · subtitle · amount · date</Text>
      </View>
      <Card variant="surface" padding="none" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        {[
          { title: 'Dominos Pizza', subtitle: 'Food • HDFC Bank', amount: 87900, type: 'expense' as const, color: categoryColors.orange, cat: 'food', date: 'Today, 1:30 PM' },
          { title: 'Salary Credited', subtitle: 'Income • Savings Account', amount: 8500000, type: 'income' as const, color: categoryColors.teal, cat: 'salary', date: 'Oct 1, 2026' },
          { title: 'Metro Card Recharge', subtitle: 'Transport • Cash', amount: 50000, type: 'expense' as const, color: categoryColors.blue, cat: 'transport', date: 'Yesterday' },
          { title: 'Freelance Payment', subtitle: 'Income • UPI', amount: 1500000, type: 'income' as const, color: categoryColors.lime, cat: 'income', date: 'Oct 3' },
        ].map((row, i) => (
          <View key={i} style={i < 3 ? { borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: spacing.lg } : { paddingHorizontal: spacing.lg }}>
            <TransactionRow
              title={row.title}
              subtitle={row.subtitle}
              amountPaise={row.amount}
              type={row.type}
              categoryColor={row.color}
              categoryName={row.cat}
              dateStr={row.date}
              onPress={() => {}}
            />
          </View>
        ))}
      </Card>

      {/* ── 11. Chip ─────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Chip</Text>
        <Text style={dyn.sectionSub}>Selectable filter tags, disabled state</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Selected" selected={chipSelected} onPress={() => setChipSelected(!chipSelected)} />
          <Chip label="Unselected" selected={false} onPress={() => setChipSelected(true)} />
          <Chip label="Colored" color={C.income} selected={false} onPress={() => {}} />
          <Chip label="Disabled" disabled selected={false} />
        </View>
      </Card>

      {/* ── 12. ListRow ──────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>ListRow</Text>
        <Text style={dyn.sectionSub}>Left icon · title · subtitle · right metric · chevron</Text>
      </View>
      <Card variant="surface" padding="none" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <ListRow title="Auto / Rickshaw" subtitle="Transport • Yesterday" left={<CategoryIcon name="car-outline" color={categoryColors.transport} size={20} variant="plain" />} right={<AmountText amountPaise={4000} type="expense" showSign size="md" />} borderBottom showChevron onPress={() => {}} />
        <ListRow title="Salary Credited" subtitle="Income • Oct 1, 2026" left={<CategoryIcon name="cash-outline" color={categoryColors.salary} size={20} variant="plain" />} right={<AmountText amountPaise={5000000} type="income" showSign size="md" />} borderBottom showChevron onPress={() => {}} />
        <ListRow title="Disabled Row" subtitle="Interaction prevented" left={<CategoryIcon name="lock-closed-outline" color={C.textMuted} size={20} variant="plain" />} disabled showChevron />
      </Card>

      {/* ── 13. Skeleton ─────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Skeleton</Text>
        <Text style={dyn.sectionSub}>Pulsing loading placeholders</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Skeleton width="100%" height={24} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="75%" height={16} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="40%" height={16} />
      </Card>

      {/* ── 14. ErrorBanner ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>ErrorBanner</Text>
        <Text style={dyn.sectionSub}>Actionable error states with retry & dismiss</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        {!bannerDismissed ? (
          <ErrorBanner message="Database query timed out while loading valuations." onRetry={() => {}} onDismiss={() => setBannerDismissed(true)} />
        ) : (
          <Button title="Restore Error Banner" size="sm" variant="secondary" onPress={() => setBannerDismissed(false)} />
        )}
      </Card>

      {/* ── 15. EmptyState ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>EmptyState</Text>
        <Text style={dyn.sectionSub}>Friendly fallback for empty lists / searches</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <EmptyState icon={<Ionicons name="cube-outline" size={40} color={C.textMuted} />} title="No Transactions Found" description="Try adjusting your date range or speaking an expense using the mic button." actionTitle="Add Transaction" onAction={() => {}} />
      </Card>

      {/* ── 16. Keypad ───────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Keypad</Text>
        <Text style={dyn.sectionSub}>3×4 numeric pad with haptic feedback</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Text style={dyn.keypadValue}>{keypadValue || '0'}</Text>
        <Keypad
          onDigit={(c) => setKeypadValue((v) => (v.length < 10 ? v + c : v))}
          onDelete={() => setKeypadValue((v) => v.slice(0, -1))}
        />
      </Card>

      {/* ── 17. FloatingNav ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>FloatingNav</Text>
        <Text style={dyn.sectionSub}>5-tab pill with centre mic button — tap tabs to switch</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <FloatingNav
          activeTab={activeNavTab}
          onSelectTab={setActiveNavTab}
          onCenterAction={() => {}}
        />
      </Card>

      {/* ── 18. Charts ───────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>Charts (SVG)</Text>
        <Text style={dyn.sectionSub}>Donut, Bar, CashflowLine, SemicircleGauge</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border, alignItems: 'center' }}>
        <Text style={[dyn.stateLabel, { alignSelf: 'flex-start', marginBottom: spacing.sm }]}>DonutChart</Text>
        <DonutChart
          size={180}
          segments={[
            { key: 'food', label: 'Food', amountPaise: 400000, color: categoryColors.orange },
            { key: 'transport', label: 'Transport', amountPaise: 250000, color: categoryColors.blue },
            { key: 'shopping', label: 'Shopping', amountPaise: 150000, color: categoryColors.violet },
          ]}
        />
        <View style={dyn.divider} />
        
        <Text style={[dyn.stateLabel, { alignSelf: 'flex-start', marginBottom: spacing.sm }]}>BarChart</Text>
        <BarChart
          width={300}
          height={160}
          data={[
            { key: 'm', label: 'Mon', amountPaise: 120000 },
            { key: 't', label: 'Tue', amountPaise: 55000 },
            { key: 'w', label: 'Wed', amountPaise: 240000 },
            { key: 'th', label: 'Thu', amountPaise: 40000 },
            { key: 'f', label: 'Fri', amountPaise: 380000 },
            { key: 'sa', label: 'Sat', amountPaise: 190000 },
            { key: 'su', label: 'Sun', amountPaise: 0 },
          ]}
        />
        <View style={dyn.divider} />
        
        <Text style={[dyn.stateLabel, { alignSelf: 'flex-start', marginBottom: spacing.sm }]}>CashflowLineChart</Text>
        <CashflowLineChart
          width={300}
          height={160}
          data={[
            { key: '1', label: '1', amountPaise: 15000 },
            { key: '2', label: '2', amountPaise: 22000 },
            { key: '3', label: '3', amountPaise: 18000 },
            { key: '4', label: '4', amountPaise: 30000, projected: true },
            { key: '5', label: '5', amountPaise: 25000, projected: true },
          ]}
        />
        <View style={dyn.divider} />
        
        <Text style={[dyn.stateLabel, { alignSelf: 'flex-start', marginBottom: spacing.sm }]}>SemicircleGauge</Text>
        <SemicircleGauge
          size={240}
          centerSubLabel="Budget Used"
          segments={[
            { key: 'spent', label: 'Spent', amountPaise: 60000, color: C.expense },
            { key: 'planned', label: 'Planned', amountPaise: 25000, color: C.warning },
          ]}
        />
      </Card>

      {/* ── 19. BottomSheet ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={dyn.sectionTitle}>BottomSheet</Text>
        <Text style={dyn.sectionSub}>Slide-up with drag handle, title, backdrop dismissal</Text>
      </View>
      <Card variant="surface" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: C.surface, borderColor: C.border }}>
        <Button title="Open Demo BottomSheet" variant="primary" onPress={() => setSheetVisible(true)} icon={<ChartIcon size={16} color={C.onAccent} />} />
      </Card>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title="UI Kit BottomSheet">
        <Text style={dyn.sheetText}>
          This bottom sheet is themed by useTheme() — surface, border, modalBackdrop, handle colour.
          Drag handle, close button, backdrop tap, and keyboard offset all work.
        </Text>
        <Button title="Close Sheet" variant="secondary" onPress={() => setSheetVisible(false)} style={{ marginTop: spacing.lg }} />
      </BottomSheet>
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────
// Root export: theme switcher lives here
// ──────────────────────────────────────────────────────────────
export default function ComponentGalleryScreen() {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Local override: start from the global active theme but let user flip locally
  const [localTheme, setLocalTheme] = useState<'night' | 'pocket'>(activeTheme);
  const C = localTheme === 'night' ? nightColors : pocketColors;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: C.surface,
            borderBottomColor: C.border,
            paddingTop: Math.max(insets.top, spacing.md),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.accent} />
          <Text style={[styles.backText, { color: C.accent }]}>Settings</Text>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.pageTitle, { color: C.text }]}>Component Gallery</Text>
          <Text style={[styles.pageSub, { color: C.textMuted }]}>Design System · D1 + D2</Text>
        </View>

        {/* Theme Switcher */}
        <View style={[styles.themePill, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {(['night', 'pocket'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setLocalTheme(t)}
              style={[
                styles.themeOption,
                localTheme === t && { backgroundColor: C.accent, borderRadius: radii.round },
              ]}
              activeOpacity={0.75}
            >
              <Ionicons
                name={t === 'night' ? 'moon-outline' : 'sunny-outline'}
                size={14}
                color={localTheme === t ? C.onAccent : C.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Gallery Body ─────────────────────────────────── */}
      <GalleryContent localTheme={localTheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  titleBlock: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  pageTitle: {
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeLg,
  },
  pageSub: {
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
  },
  themePill: {
    flexDirection: 'row',
    borderRadius: radii.round,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 2,
    gap: 2,
  },
  themeOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: typography.sizeBase,
  },
});
