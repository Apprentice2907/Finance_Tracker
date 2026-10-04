import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { TrashIcon, ExportIcon, ImportIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { getRepository } from '../src/db';

function SettingsContent() {
  const { categories, keywords, deleteKeyword, showBanner } = useAppStore();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBackupInfo() {
      try {
        const repo = getRepository();
        const setting = await repo.getSetting('last_backup_at');
        setLastBackupAt(setting);
      } catch (err) {
        console.error('Failed to load backup setting:', err);
      }
    }
    fetchBackupInfo();
  }, []);

  const handleDeleteKeyword = async (id: string, word: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await deleteKeyword(id);
    showBanner(`Removed "${word}" from learned keywords.`);
  };

  // Check if last backup was more than 14 days ago
  const isBackupStale = () => {
    if (!lastBackupAt) return true;
    const backupDate = new Date(lastBackupAt);
    const diffDays = (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 14;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings ⚙️</Text>
          <Text style={styles.subtitle}>Categories, learned vocabulary & data backup</Text>
        </View>

        {/* Section: Backup & Restore */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Backup & Restore</Text>
            {isBackupStale() && (
              <View style={styles.staleBadge}>
                <Text style={styles.staleBadgeText}>Reminder</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionDesc}>
            Wini stores all data locally. Export a JSON backup to keep your transactions safe.
          </Text>

          <View style={styles.backupCard}>
            <View style={styles.backupStatusRow}>
              <Text style={styles.backupStatusLabel}>Last Backup</Text>
              <Text style={styles.backupStatusValue}>
                {lastBackupAt
                  ? new Date(lastBackupAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Never'}
              </Text>
            </View>

            {isBackupStale() && (
              <View style={styles.reminderBanner}>
                <Text style={styles.reminderText}>
                  💡 It has been more than 14 days since your last backup. We recommend exporting your data.
                </Text>
              </View>
            )}

            <View style={styles.backupActions}>
              <TouchableOpacity
                style={[styles.backupBtn, styles.backupBtnPrimary]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  showBanner('Backup export configured for Phase 5 release.');
                }}
                activeOpacity={0.8}
              >
                <ExportIcon size={16} color="#FFFFFF" />
                <Text style={styles.backupBtnPrimaryText}>Export Backup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backupBtn, styles.backupBtnSecondary]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  showBanner('Backup import configured for Phase 5 release.');
                }}
                activeOpacity={0.8}
              >
                <ImportIcon size={16} color={colors.text} />
                <Text style={styles.backupBtnSecondaryText}>Import Backup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section: Learned Keywords */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Learned Keywords</Text>
            <Text style={styles.sectionBadge}>{keywords.length}</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Wini automatically remembers vocabulary when you confirm categories.
          </Text>

          {keywords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No learned keywords yet. When you assign an unknown word to a category, Wini will remember it here!
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {keywords.map((kw, idx) => (
                <View
                  key={kw.id}
                  style={[
                    styles.keywordRow,
                    idx === keywords.length - 1 && styles.rowLast,
                  ]}
                >
                  <View style={styles.keywordInfo}>
                    <Text style={styles.keywordWord}>"{kw.word}"</Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryEmoji}>{kw.category_emoji || '✨'}</Text>
                      <Text style={styles.categoryName}>{kw.category_name || 'General'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteKeyword(kw.id, kw.word)}
                    hitSlop={12}
                    style={styles.deleteBtn}
                    accessibilityLabel={`Delete keyword ${kw.word}`}
                  >
                    <TrashIcon size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section: Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Categories</Text>
            <Text style={styles.sectionBadge}>{categories.length}</Text>
          </View>

          <View style={styles.card}>
            {categories.map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  idx === categories.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.catLeft}>
                  <View
                    style={[
                      styles.catEmojiWrap,
                      { backgroundColor: `${cat.color}22` },
                    ]}
                  >
                    <Text style={styles.catEmojiText}>{cat.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.catTitle}>{cat.name}</Text>
                    <Text style={styles.catSubtitle}>
                      {cat.kind === 'income' ? 'Income Category' : 'Expense Category'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: cat.color },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Section: About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.card, { padding: spacing.lg }]}>
            <Text style={styles.aboutName}>Wini 🛺</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Expo SDK 57)</Text>
            <Text style={styles.aboutDesc}>
              Personal, voice-first, local-first finance tracker. Your financial data is stored
              exclusively in local SQLite on your phone. No accounts, no cloud tracking, no subscriptions.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  return (
    <ErrorBoundary fallbackTitle="Settings unavailable">
      <SettingsContent />
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
  header: {
    marginBottom: spacing.xl,
    paddingTop: 8,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: colors.elevated,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  staleBadge: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  staleBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionDesc: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  backupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  backupStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backupStatusLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  backupStatusValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  reminderBanner: {
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    borderColor: 'rgba(255, 200, 87, 0.3)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  reminderText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  backupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: 6,
  },
  backupBtnPrimary: {
    backgroundColor: colors.primary,
  },
  backupBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  backupBtnSecondary: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  backupBtnSecondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  keywordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  keywordWord: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  categoryEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  catEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmojiText: {
    fontSize: 18,
  },
  catTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  catSubtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  aboutName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  aboutVersion: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  aboutDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
