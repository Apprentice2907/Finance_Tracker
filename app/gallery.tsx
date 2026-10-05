/**
 * Component Gallery (Developer Screen).
 * Where it fits: Reachable from Settings → Developer (`/gallery`).
 *
 * Demonstrates all 13 shared UI kit components in all states:
 * default, pressed, disabled, loading, empty, and error.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
} from '../src/ui/kit';
import { colors, spacing, typography, radii } from '../src/ui/tokens';
import {
  WalletIcon,
  MicIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ChartIcon,
  SettingsIcon,
} from '../src/ui/icons';

export default function ComponentGalleryScreen() {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('month');
  const [chipSelected, setChipSelected] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  return (
    <Screen scrollable safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Settings</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Component Gallery</Text>
        <Text style={styles.pageSubtitle}>
          Design System &amp; UI Kit Tokens Preview (All States)
        </Text>
      </View>

      {/* 1. Tokens: Color Palette */}
      <SectionHeader title="Design Tokens: Colors" subtitle="Semantic & Core Palettes" />
      <Card variant="surface" style={styles.galleryCard}>
        <View style={styles.colorGrid}>
          {[
            { label: 'Primary', val: colors.primary },
            { label: 'Income', val: colors.income },
            { label: 'Expense', val: colors.expense },
            { label: 'Danger', val: colors.danger },
            { label: 'Warning', val: colors.warning },
            { label: 'Purple', val: colors.accentPurple },
            { label: 'Surface', val: colors.surface },
            { label: 'Elevated', val: colors.elevated },
          ].map((c) => (
            <View key={c.label} style={styles.colorCell}>
              <View style={[styles.colorSwatch, { backgroundColor: c.val }]} />
              <Text style={styles.colorName}>{c.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* 2. AmountText */}
      <SectionHeader
        title="AmountText"
        subtitle="Handles Indian currency grouping, income/expense coloring & sizes"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <View style={styles.rowWrap}>
          <View style={styles.subItem}>
            <Text style={styles.stateLabel}>Income (+sign)</Text>
            <AmountText amountPaise={12500000} type="income" showSign size="xl" />
          </View>
          <View style={styles.subItem}>
            <Text style={styles.stateLabel}>Expense (−sign)</Text>
            <AmountText amountPaise={45000} type="expense" showSign size="xl" />
          </View>
          <View style={styles.subItem}>
            <Text style={styles.stateLabel}>Neutral</Text>
            <AmountText amountPaise={250000} type="neutral" size="xl" />
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.stateLabel}>Hero / Display Typography</Text>
        <AmountText amountPaise={150000000} type="income" showSign size="hero" />
      </Card>

      {/* 3. Buttons (All States & Variants) */}
      <SectionHeader
        title="Button"
        subtitle="Variants (primary, secondary, ghost, danger) & States"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <Text style={styles.stateLabel}>Variants (Default State)</Text>
        <View style={styles.buttonStack}>
          <Button
            title="Primary Action"
            variant="primary"
            onPress={() => {}}
            icon={<PlusIcon size={16} color={colors.white} />}
          />
          <Button
            title="Secondary Action"
            variant="secondary"
            onPress={() => {}}
            icon={<SettingsIcon size={16} color={colors.text} />}
          />
          <Button
            title="Danger Action"
            variant="danger"
            onPress={() => {}}
            icon={<TrashIcon size={16} color={colors.white} />}
          />
          <Button title="Ghost Action" variant="ghost" onPress={() => {}} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.stateLabel}>States: Disabled &amp; Loading</Text>
        <View style={styles.buttonStack}>
          <Button
            title="Disabled Primary"
            variant="primary"
            disabled
            onPress={() => {}}
          />
          <Button
            title={buttonLoading ? 'Loading...' : 'Tap for Loading State'}
            variant="secondary"
            loading={buttonLoading}
            onPress={() => {
              setButtonLoading(true);
              setTimeout(() => setButtonLoading(false), 2000);
            }}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.stateLabel}>Sizes: Small, Medium, Large</Text>
        <View style={styles.buttonRow}>
          <Button title="Small" size="sm" variant="secondary" onPress={() => {}} />
          <Button title="Medium" size="md" variant="secondary" onPress={() => {}} />
          <Button title="Large" size="lg" variant="primary" onPress={() => {}} />
        </View>
      </Card>

      {/* 4. IconButton */}
      <SectionHeader
        title="IconButton"
        subtitle="Variants & States (default, surface, glass, primary, danger, disabled)"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <View style={styles.iconButtonRow}>
          <View style={styles.iconCell}>
            <IconButton
              icon={<MicIcon size={20} color={colors.white} />}
              variant="primary"
              onPress={() => {}}
            />
            <Text style={styles.iconLabel}>Primary</Text>
          </View>
          <View style={styles.iconCell}>
            <IconButton
              icon={<SearchIcon size={20} color={colors.text} />}
              variant="surface"
              onPress={() => {}}
            />
            <Text style={styles.iconLabel}>Surface</Text>
          </View>
          <View style={styles.iconCell}>
            <IconButton
              icon={<WalletIcon size={20} color={colors.accentPurple} />}
              variant="glass"
              onPress={() => {}}
            />
            <Text style={styles.iconLabel}>Glass</Text>
          </View>
          <View style={styles.iconCell}>
            <IconButton
              icon={<TrashIcon size={20} color={colors.white} />}
              variant="danger"
              onPress={() => {}}
            />
            <Text style={styles.iconLabel}>Danger</Text>
          </View>
          <View style={styles.iconCell}>
            <IconButton
              icon={<MicIcon size={20} color={colors.white} />}
              variant="primary"
              disabled
              onPress={() => {}}
            />
            <Text style={styles.iconLabel}>Disabled</Text>
          </View>
        </View>
      </Card>

      {/* 5. Chip */}
      <SectionHeader
        title="Chip"
        subtitle="Selectable tags, emojis, custom category colors, disabled"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <View style={styles.chipWrap}>
          <Chip
            label="Selected Chip"
            emoji="✨"
            selected={chipSelected}
            onPress={() => setChipSelected(!chipSelected)}
          />
          <Chip
            label="Unselected"
            emoji="🍕"
            selected={false}
            onPress={() => setChipSelected(true)}
          />
          <Chip
            label="Custom Color"
            emoji="🚕"
            color={colors.income}
            selected={false}
            onPress={() => {}}
          />
          <Chip
            label="Disabled Chip"
            emoji="🔒"
            disabled
            selected={false}
          />
        </View>
      </Card>

      {/* 6. Card Variants */}
      <SectionHeader
        title="Card"
        subtitle="Variants: surface, elevated, glass, outlined (with onPress)"
      />
      <View style={styles.cardVariantStack}>
        <Card variant="surface">
          <Text style={styles.cardTitle}>Surface Card</Text>
          <Text style={styles.cardBody}>Standard base card with subtle border.</Text>
        </Card>
        <Card variant="elevated">
          <Text style={styles.cardTitle}>Elevated Card</Text>
          <Text style={styles.cardBody}>High-contrast container for focal metrics.</Text>
        </Card>
        <Card variant="glass">
          <Text style={styles.cardTitle}>Glass Card</Text>
          <Text style={styles.cardBody}>Translucent frosted glass styling.</Text>
        </Card>
        <Card variant="outlined" onPress={() => {}}>
          <Text style={styles.cardTitle}>Outlined Clickable Card (Tap me)</Text>
          <Text style={styles.cardBody}>Transparent background with tap opacity.</Text>
        </Card>
      </View>

      {/* 7. SegmentedControl */}
      <SectionHeader
        title="SegmentedControl"
        subtitle="Multi-option tab bar with active animation & icons"
      />
      <Card variant="surface" style={styles.galleryCard}>
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
      </Card>

      {/* 8. ListRow */}
      <SectionHeader
        title="ListRow"
        subtitle="Standard list item with left icon, title, subtitle, right metric & chevron"
      />
      <Card variant="surface" padding="none" style={styles.galleryCard}>
        <ListRow
          title="Auto / Rickshaw"
          subtitle="Transport • Yesterday"
          left={<Text style={styles.listEmoji}>🛺</Text>}
          right={<AmountText amountPaise={4000} type="expense" showSign size="md" />}
          borderBottom
          showChevron
          onPress={() => {}}
        />
        <ListRow
          title="Salary Credited"
          subtitle="Income • Oct 1, 2026"
          left={<Text style={styles.listEmoji}>💰</Text>}
          right={<AmountText amountPaise={5000000} type="income" showSign size="md" />}
          borderBottom
          showChevron
          onPress={() => {}}
        />
        <ListRow
          title="Disabled Row"
          subtitle="Interaction prevented"
          left={<Text style={styles.listEmoji}>🔒</Text>}
          disabled
          showChevron
        />
      </Card>

      {/* 9. Skeleton */}
      <SectionHeader
        title="Skeleton"
        subtitle="Pulsing loading placeholders for network/database queries"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <Skeleton width="100%" height={24} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="75%" height={16} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="40%" height={16} />
      </Card>

      {/* 10. ErrorBanner */}
      <SectionHeader
        title="ErrorBanner"
        subtitle="Actionable error states with retry & dismiss callbacks"
      />
      <Card variant="surface" style={styles.galleryCard}>
        {!bannerDismissed ? (
          <ErrorBanner
            message="Database query timed out while loading valuations."
            onRetry={() => {}}
            onDismiss={() => setBannerDismissed(true)}
          />
        ) : (
          <Button
            title="Restore Error Banner"
            size="sm"
            variant="secondary"
            onPress={() => setBannerDismissed(false)}
          />
        )}
      </Card>

      {/* 11. EmptyState */}
      <SectionHeader
        title="EmptyState"
        subtitle="Friendly fallback when lists, accounts, or searches are empty"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <EmptyState
          emoji="📦"
          title="No Transactions Found"
          description="Try adjusting your date range or speaking an expense using the mic button."
          actionTitle="Add Transaction"
          onAction={() => {}}
        />
      </Card>

      {/* 12. BottomSheet */}
      <SectionHeader
        title="BottomSheet"
        subtitle="Slide-up modal container with drag handle, title & backdrop dismissal"
      />
      <Card variant="surface" style={styles.galleryCard}>
        <Button
          title="Open Demo BottomSheet"
          variant="primary"
          onPress={() => setSheetVisible(true)}
          icon={<ChartIcon size={16} color={colors.white} />}
        />
      </Card>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="UI Kit BottomSheet"
      >
        <Text style={styles.sheetText}>
          This bottom sheet is driven by tokens (radii.xl, modalBackdrop, border) and handles
          touch dismissal, accessible drag handle, and cross-platform keyboard offsets.
        </Text>
        <Button
          title="Close Sheet"
          variant="secondary"
          onPress={() => setSheetVisible(false)}
          style={{ marginTop: spacing.lg }}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backArrow: {
    color: colors.primary,
    fontSize: typography.sizeLg,
    marginRight: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  pageTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeXxl,
  },
  pageSubtitle: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    marginTop: 4,
  },
  galleryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorCell: {
    alignItems: 'center',
    width: 72,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorName: {
    color: colors.muted,
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeXs,
  },
  rowWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subItem: {
    alignItems: 'center',
  },
  stateLabel: {
    color: colors.muted,
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeXs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iconCell: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconLabel: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardVariantStack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeBase,
    marginBottom: 4,
  },
  cardBody: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
  },
  listEmoji: {
    fontSize: 24,
  },
  sheetText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: typography.sizeBase,
    lineHeight: typography.lineHeightBase,
  },
});
