/**
 * Settings and Data Management screen for Wini.
 * Where it fits: Accessible via the "Settings" tab in the bottom bar (`/settings`).
 *
 * Beginner note: This screen lets users manage categories, review and delete learned
 * vocabulary keywords from `keyword_map`, and export/import full JSON backups to safeguard
 * their data without requiring cloud accounts.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { TrashIcon, ExportIcon, ImportIcon, MicIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { getRepository } from '../src/db';
import {
  exportBackupFile,
  pickAndValidateBackupFile,
  BackupPreview,
} from '../src/backup/backupService';
import { BackupModal } from '../src/ui/BackupModal';

function SettingsContent() {
  const router = useRouter();
  const {
    categories,
    keywords,
    deleteKeyword,
    learnKeyword,
    showBanner,
    keepVoiceLog,
    preferOnDevice,
    voiceEngine,
    toggleKeepVoiceLog,
    togglePreferOnDevice,
    clearVoiceLogs,
  } = useAppStore();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [isBackupStale, setIsBackupStale] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [voiceLogCount, setVoiceLogCount] = useState<number>(0);
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ word: string; categoryId: string; count: number }[]>([]);

  useEffect(() => {
    async function fetchBackupInfo() {
      try {
        const repo = getRepository();
        const setting = await repo.getSetting('last_backup_at');
        setLastBackupAt(setting);
        if (setting) {
          const backupDate = new Date(setting);
          const diffDays = (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24);
          setIsBackupStale(diffDays > 14);
        } else {
          setIsBackupStale(true);
        }

        const count = await repo.getVoiceLogCount();
        setVoiceLogCount(count);

        const suggestions = await repo.getSuggestedKeywordsFromVoiceLogs();
        setSuggestedKeywords(suggestions);
      } catch (err) {
        console.error('Failed to load settings data:', err);
      }
    }
    fetchBackupInfo();
  }, []);

  const handleToggleKeepVoiceLog = async (val: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    await toggleKeepVoiceLog(val);
    showBanner(val ? 'Voice logging enabled.' : 'Voice logging disabled.');
  };

  const handleTogglePreferOnDevice = async (val: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    await togglePreferOnDevice(val);
    showBanner(
      val
        ? 'Preferring on-device recognition (more private).'
        : 'Preferring online recognition (often more accurate).'
    );
  };

  const handleClearVoiceLog = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await clearVoiceLogs();
    setVoiceLogCount(0);
    setSuggestedKeywords([]);
    showBanner('Voice log cleared.');
  };

  const handleLearnSuggested = async (word: string, categoryId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await learnKeyword(word, categoryId);
    showBanner(`Learned "${word}"!`);
    const repo = getRepository();
    const suggestions = await repo.getSuggestedKeywordsFromVoiceLogs();
    setSuggestedKeywords(suggestions);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await exportBackupFile();
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showBanner('Backup exported successfully.');
        const repo = getRepository();
        const setting = await repo.getSetting('last_backup_at');
        setLastBackupAt(setting);
      } else {
        showBanner(res.error || 'Failed to export backup.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const res = await pickAndValidateBackupFile();
      if (res.canceled) return;
      if (!res.success || !res.preview) {
        showBanner(res.error || 'Invalid backup file.');
        return;
      }
      setImportPreview(res.preview);
      setBackupModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteKeyword = async (id: string, word: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await deleteKeyword(id);
    showBanner(`Removed "${word}" from learned keywords.`);
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

        {/* Section: Voice & Accuracy */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Voice & Accuracy</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Configure recognition privacy, test phrases in Voice Lab, and manage correction logs.
          </Text>

          {/* Voice Lab Navigation Card */}
          <TouchableOpacity
            style={styles.voiceLabCard}
            onPress={() => router.push('/voice-lab')}
            activeOpacity={0.8}
          >
            <View style={styles.voiceLabLeft}>
              <View style={styles.voiceLabIconWrap}>
                <MicIcon size={20} color={colors.primary} />
              </View>
              <View style={styles.voiceLabTextContainer}>
                <Text style={styles.voiceLabTitle}>Open Voice Lab 🔬</Text>
                <Text style={styles.voiceLabDesc}>
                  Record test phrases, benchmark latency, and inspect alternatives.
                </Text>
              </View>
            </View>
            <Text style={styles.voiceLabArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            {/* Active Voice Engine Row */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Recognition Engine</Text>
                <Text style={styles.toggleSubtitle}>
                  {voiceEngine === 'whisper' ? 'Whisper (On-device neural model)' : 'Phone Recognizer (Android / System STT)'}
                </Text>
              </View>
              <View style={styles.engineBadgeSmall}>
                <Text style={styles.engineBadgeSmallText}>
                  {voiceEngine === 'whisper' ? 'Whisper' : 'System'}
                </Text>
              </View>
            </View>

            {/* Switch: Keep voice log */}
            <View style={[styles.toggleRow, styles.rowDivider]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Keep voice log</Text>
                <Text style={styles.toggleSubtitle}>
                  Saves heard transcripts & parsed outputs locally for accuracy benchmarking. Audio is never stored.
                </Text>
              </View>
              <Switch
                value={keepVoiceLog}
                onValueChange={handleToggleKeepVoiceLog}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Switch: Prefer on-device recognition */}
            <View style={[styles.toggleRow, styles.rowDivider]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Prefer on-device recognition</Text>
                <Text style={styles.toggleSubtitle}>
                  On-device recognition keeps audio strictly on phone. Online recognition is often more accurate for mixed Hindi/English accents.
                </Text>
              </View>
              <Switch
                value={preferOnDevice}
                onValueChange={handleTogglePreferOnDevice}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Action: Clear voice log */}
            <View style={[styles.toggleRow, styles.rowDivider]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Voice log records</Text>
                <Text style={styles.toggleSubtitle}>
                  {voiceLogCount} record{voiceLogCount === 1 ? '' : 's'} in local database.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.clearLogBtn, voiceLogCount === 0 && { opacity: 0.5 }]}
                onPress={handleClearVoiceLog}
                disabled={voiceLogCount === 0}
                activeOpacity={0.8}
              >
                <TrashIcon size={14} color={colors.expense} />
                <Text style={styles.clearLogBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Suggestions from corrections */}
          {suggestedKeywords.length > 0 && (
            <View style={styles.suggestionsCard}>
              <Text style={styles.suggestionsTitle}>💡 Suggestions from Voice Corrections</Text>
              <Text style={styles.suggestionsDesc}>
                Words corrected when confirming voice entries:
              </Text>
              <View style={styles.suggestionChips}>
                {suggestedKeywords.map((sug) => {
                  const cat = categories.find((c) => c.id === sug.categoryId);
                  return (
                    <TouchableOpacity
                      key={`${sug.word}_${sug.categoryId}`}
                      style={styles.suggestionChip}
                      onPress={() => handleLearnSuggested(sug.word, sug.categoryId)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.suggestionChipText}>
                        &ldquo;{sug.word}&rdquo; → {cat?.emoji || '✨'} {cat?.name || 'General'}
                      </Text>
                      <Text style={styles.suggestionPlus}>+ Learn</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Section: Backup & Restore */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Backup & Restore</Text>
            {isBackupStale && (
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

            {isBackupStale && (
              <View style={styles.reminderBanner}>
                <Text style={styles.reminderText}>
                  💡 It has been more than 14 days since your last backup. We recommend exporting your data.
                </Text>
              </View>
            )}

            <View style={styles.backupActions}>
              <TouchableOpacity
                style={[styles.backupBtn, styles.backupBtnPrimary]}
                onPress={handleExport}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                <ExportIcon size={16} color="#FFFFFF" />
                <Text style={styles.backupBtnPrimaryText}>
                  {isExporting ? 'Exporting...' : 'Export Backup'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backupBtn, styles.backupBtnSecondary]}
                onPress={handleImport}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                <ImportIcon size={16} color={colors.text} />
                <Text style={styles.backupBtnSecondaryText}>
                  {isImporting ? 'Reading...' : 'Import Backup'}
                </Text>
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
                    <Text style={styles.keywordWord}>{`"${kw.word}"`}</Text>
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

      {/* Backup Preview & Restore Modal */}
      <BackupModal
        visible={backupModalVisible}
        preview={importPreview}
        onClose={() => setBackupModalVisible(false)}
        onSuccess={(msg) => {
          showBanner(msg);
          const repo = getRepository();
          repo.getSetting('last_backup_at').then(setLastBackupAt);
        }}
      />
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
  engineBadgeSmall: {
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  engineBadgeSmallText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  voiceLabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.primary}18`,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  voiceLabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    paddingRight: spacing.sm,
  },
  voiceLabIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceLabTextContainer: {
    flex: 1,
  },
  voiceLabTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  voiceLabDesc: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  voiceLabArrow: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  clearLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.expense}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: `${colors.expense}44`,
  },
  clearLogBtnText: {
    color: colors.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsCard: {
    backgroundColor: `${colors.warning}12`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.warning}33`,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  suggestionsTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionsDesc: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipText: {
    color: colors.text,
    fontSize: 12,
  },
  suggestionPlus: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
