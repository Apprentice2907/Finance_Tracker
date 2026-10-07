/**
 * Settings and Data Management screen for Wini.
 * Where it fits: Accessible via the "Settings" tab in the bottom bar (`/settings`).
 *
 * Beginner note: This screen lets users manage categories, review and delete learned
 * vocabulary keywords from `keyword_map`, and export/import full JSON backups to safeguard
 * their data without requiring cloud accounts.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useTheme } from '../src/ui/ThemeContext';
import { useAppStore } from '../src/state/useAppStore';
import { TrashIcon, ExportIcon, ImportIcon, MicIcon, CheckCircleIcon } from '../src/ui/icons';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
import { getRepository } from '../src/db';
import {
  exportBackupFile,
  pickAndValidateBackupFile,
  BackupPreview,
} from '../src/backup/backupService';
import { BackupModal } from '../src/ui/BackupModal';
import { defaultModelManager, WhisperModelId } from '../src/speech';

import { Screen, CategoryIcon } from '../src/ui/kit';
import { shouldShowBackupReminder, formatRelativeDate, pluralize } from '../src/utils/microcopy';

function SettingsContent() {
  const router = useRouter();
  const {
    categories,
    keywords,
    groupedTransactions,
    deleteKeyword,
    learnKeyword,
    showBanner,
    keepVoiceLog,
    preferOnDevice,
    voiceEngine,
    whisperModel,
    whisperLanguage,
    autoAddMode,
    autoAddLimitPaise,
    toggleKeepVoiceLog,
    togglePreferOnDevice,
    setVoiceEngine,
    setWhisperModel,
    setWhisperLanguage,
    setAutoAddMode,
    setAutoAddLimitPaise,
    clearVoiceLogs,
  } = useAppStore();
  const { mode: themeMode, activeTheme, colors: themeColors, setThemeMode } = useTheme();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [isBackupStale, setIsBackupStale] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [voiceLogCount, setVoiceLogCount] = useState<number>(0);
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ word: string; categoryId: string; count: number }[]>([]);
  const [modelDownloaded, setModelDownloaded] = useState<Record<string, boolean>>({});
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const refreshModelStatuses = useCallback(async () => {
    try {
      const statuses: Record<string, boolean> = {};
      for (const id of ['tiny', 'base', 'small'] as WhisperModelId[]) {
        statuses[id] = await defaultModelManager.isModelDownloaded(id);
      }
      setModelDownloaded(statuses);
    } catch {
      // Ignore in mock/web
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const statuses: Record<string, boolean> = {};
        for (const id of ['tiny', 'base', 'small'] as WhisperModelId[]) {
          statuses[id] = await defaultModelManager.isModelDownloaded(id);
        }
        if (isMounted) {
          setModelDownloaded(statuses);
        }
      } catch {
        // Ignore in mock/web
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function fetchBackupInfo() {
      try {
        const repo = getRepository();
        const setting = await repo.getSetting('last_backup_at');
        setLastBackupAt(setting);
        const allTxs = groupedTransactions.flatMap((g) => g.transactions);
        const firstTx = allTxs.length > 0 ? allTxs[allTxs.length - 1] : null;

        const isStale = shouldShowBackupReminder({
          transactionCount: allTxs.length,
          firstTransactionDate: firstTx?.occurred_on,
          lastBackupDate: setting,
        });
        setIsBackupStale(isStale);

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

  const handleSelectEngine = async (eng: 'expo' | 'whisper') => {
    Haptics.selectionAsync().catch(() => {});
    await setVoiceEngine(eng);
    if (eng === 'whisper') {
      const isDownloaded = await defaultModelManager.isModelDownloaded((whisperModel as WhisperModelId) || 'base');
      if (!isDownloaded) {
        showBanner(`Switched to Whisper. Model (${whisperModel}) needs to be downloaded before offline use.`);
      } else {
        showBanner('Switched to On-device Whisper engine.');
      }
    } else {
      showBanner('Switched to Phone Recognizer engine.');
    }
  };

  const handleSelectModel = async (modelId: WhisperModelId) => {
    Haptics.selectionAsync().catch(() => {});
    await setWhisperModel(modelId);
    showBanner(`Selected Whisper ${modelId} model.`);
  };

  const handleDownloadModel = async (modelId: WhisperModelId) => {
    const model = defaultModelManager.getModelInfo(modelId);
    try {
      setDownloadingModelId(modelId);
      setDownloadProgress(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      showBanner(`Starting download of ${model.name}...`);

      await defaultModelManager.downloadModel(modelId, (percent) => {
        setDownloadProgress(percent);
      });

      await refreshModelStatuses();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showBanner(`${model.name} downloaded successfully! Now ready for offline voice entries.`);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showBanner(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingModelId(null);
      setDownloadProgress(0);
    }
  };

  const handleDeleteModel = async (modelId: WhisperModelId) => {
    const model = defaultModelManager.getModelInfo(modelId);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      await defaultModelManager.deleteModel(modelId);
      await refreshModelStatuses();
      showBanner(`Deleted ${model.name} from storage.`);
    } catch (err: any) {
      showBanner(`Failed to delete model: ${err.message}`);
    }
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
    <Screen scrollable={true} hasTabBar={true} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Categories, learned vocabulary & data backup
          </Text>
        </View>

        {/* Section: Appearance & Theme */}
        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Appearance & Theme</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: themeColors.textMuted }]}>
            Choose between Night (dark fintech with lime accent) and Pocket (clean light wallet with blue accent).
          </Text>

          <View style={styles.engineTabsContainer}>
            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                themeMode === 'system' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setThemeMode('system');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  themeMode === 'system' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                System
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>Auto-match OS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                themeMode === 'night' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setThemeMode('night');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  themeMode === 'night' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Night
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>Dark fintech</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                themeMode === 'pocket' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setThemeMode('pocket');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  themeMode === 'pocket' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Pocket
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>Light wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Add Behaviour */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add Behaviour</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Control whether recognized entries are saved automatically or verified first.
          </Text>

          <View style={styles.engineTabsContainer}>
            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                autoAddMode === 'ask' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAutoAddMode('ask');
                showBanner('Add mode: Ask me every time');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  autoAddMode === 'ask' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Ask every time
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>
                Always confirm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                autoAddMode === 'sure' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAutoAddMode('sure');
                showBanner('Add mode: Auto-add when sure');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  autoAddMode === 'sure' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                When sure
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>
                Auto-add (Default)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.engineTab,
                { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                autoAddMode === 'always' && [
                  styles.engineTabActive,
                  { borderColor: themeColors.accent, backgroundColor: themeColors.surface2 },
                ],
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAutoAddMode('always');
                showBanner('Add mode: Always auto-add');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.engineTabText,
                  { color: themeColors.text },
                  autoAddMode === 'always' && { color: themeColors.accent, fontWeight: '700' },
                ]}
              >
                Always auto
              </Text>
              <Text style={[styles.engineTabSub, { color: themeColors.textMuted }]}>
                Skip confirm
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto-Add Limit Selector (applicable for 'sure' mode) */}
          {autoAddMode === 'sure' && (
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: spacing.md }]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Auto-add limit</Text>
                <Text style={styles.toggleSubtitle}>
                  Entries under this amount are auto-added when confidence is 90% or higher. Larger amounts show the confirm sheet.
                </Text>
              </View>
              <View style={styles.limitPillRow}>
                {[
                  { label: '₹500', value: 50000 },
                  { label: '₹1,000', value: 100000 },
                  { label: '₹2,000', value: 200000 },
                  { label: '₹5,000', value: 500000 },
                  { label: '₹10,000', value: 1000000 },
                ].map((lim) => {
                  const isSelected = autoAddLimitPaise === lim.value;
                  return (
                    <TouchableOpacity
                      key={lim.value}
                      style={[
                        styles.limitPill,
                        { backgroundColor: themeColors.surface2, borderColor: themeColors.border },
                        isSelected && { backgroundColor: themeColors.accent, borderColor: themeColors.accent },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setAutoAddLimitPaise(lim.value);
                        showBanner(`Auto-add limit set to ${lim.label}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.limitPillText,
                          { color: themeColors.text },
                          isSelected && { color: colors.black, fontWeight: '700' },
                        ]}
                      >
                        {lim.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
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
                <Text style={styles.voiceLabTitle}>Open Voice Lab</Text>
                <Text style={styles.voiceLabDesc}>
                  Record test phrases, benchmark latency, and inspect alternatives.
                </Text>
              </View>
            </View>
            <Text style={styles.voiceLabArrow}>→</Text>
          </TouchableOpacity>

          {/* Voice Check Navigation Card */}
          <TouchableOpacity
            style={[styles.voiceLabCard, { marginTop: 8 }]}
            onPress={() => router.push('/voice-check' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.voiceLabLeft}>
              <View style={styles.voiceLabIconWrap}>
                <CheckCircleIcon size={20} color={colors.income} />
              </View>
              <View style={styles.voiceLabTextContainer}>
                <Text style={styles.voiceLabTitle}>Voice Check</Text>
                <Text style={styles.voiceLabDesc}>
                  Run the 50-phrase benchmark suite, check accuracy & export results.
                </Text>
              </View>
            </View>
            <Text style={styles.voiceLabArrow}>→</Text>
          </TouchableOpacity>

          {/* Engine Selector Tabs */}
          <View style={styles.engineTabsContainer}>
            <TouchableOpacity
              style={[styles.engineTab, voiceEngine !== 'whisper' && styles.engineTabActive]}
              onPress={() => handleSelectEngine('expo')}
              activeOpacity={0.8}
            >
              <Text style={[styles.engineTabText, voiceEngine !== 'whisper' && styles.engineTabTextActive]}>
                Phone Recognizer
              </Text>
              <Text style={styles.engineTabSub}>Built-in fast STT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engineTab, voiceEngine === 'whisper' && styles.engineTabActive]}
              onPress={() => handleSelectEngine('whisper')}
              activeOpacity={0.8}
            >
              <Text style={[styles.engineTabText, voiceEngine === 'whisper' && styles.engineTabTextActive]}>
                On-Device Whisper
              </Text>
              <Text style={styles.engineTabSub}>100% offline & private</Text>
            </TouchableOpacity>
          </View>

          {/* If Whisper selected: Show model manager */}
          {voiceEngine === 'whisper' && (
            <View style={styles.whisperModelSection}>
              <View style={styles.whisperHeaderRow}>
                <Text style={styles.whisperSectionTitle}>Quantized Whisper Models</Text>
                <Text style={styles.whisperSectionDesc}>
                  Download once from the internet; all speech recognition runs 100% offline on your phone with zero data sent anywhere.
                </Text>
              </View>

              {(['tiny', 'base', 'small'] as WhisperModelId[]).map((id) => {
                const info = defaultModelManager.getModelInfo(id);
                const isDownloaded = !!modelDownloaded[id];
                const isSelected = whisperModel === id;
                const isDownloading = downloadingModelId === id;
                const sizeMB = (info.byteSize / (1024 * 1024)).toFixed(1);

                return (
                  <View
                    key={id}
                    style={[
                      styles.modelCard,
                      isSelected && styles.modelCardSelected,
                    ]}
                  >
                    <View style={styles.modelHeaderRow}>
                      <TouchableOpacity
                        style={styles.modelSelectArea}
                        onPress={() => isDownloaded && handleSelectModel(id)}
                        disabled={!isDownloaded}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.modelNameWrap}>
                          <View style={styles.modelTitleRow}>
                            <Text style={styles.modelName}>{info.name}</Text>
                            {info.isDefault && <Text style={styles.badgeDefault}>Default</Text>}
                            {info.isRecommended && <Text style={styles.badgeRec}>Recommended</Text>}
                          </View>
                          <Text style={styles.modelDesc}>{info.description}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.modelActionArea}>
                        {isDownloading ? (
                          <View style={styles.downloadingPill}>
                            <Text style={styles.downloadingText}>{downloadProgress}%</Text>
                          </View>
                        ) : isDownloaded ? (
                          <TouchableOpacity
                            style={styles.deleteModelBtn}
                            onPress={() => handleDeleteModel(id)}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <TrashIcon size={14} color={colors.expense} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.downloadModelBtn}
                            onPress={() => handleDownloadModel(id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.downloadModelBtnText}>Download ({sizeMB} MB)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {isDownloading && (
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Whisper Language Selector */}
              <View style={styles.langModeWrap}>
                <View style={styles.langModeTextWrap}>
                  <Text style={styles.langModeTitle}>Whisper Language Mode</Text>
                  <Text style={styles.langModeSubtitle}>
                    {whisperLanguage === 'auto'
                      ? 'Auto-detect spoken language (supports Hindi & English).'
                      : 'English / Romanized (recommended for Hinglish expenses like "chai 20 rupees").'}
                  </Text>
                </View>
                <View style={styles.langButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.langBtn,
                      whisperLanguage === 'en' && styles.langBtnActive,
                    ]}
                    onPress={() => setWhisperLanguage('en')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        whisperLanguage === 'en' && styles.langBtnTextActive,
                      ]}
                    >
                      English (en)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.langBtn,
                      whisperLanguage === 'auto' && styles.langBtnActive,
                    ]}
                    onPress={() => setWhisperLanguage('auto')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        whisperLanguage === 'auto' && styles.langBtnTextActive,
                      ]}
                    >
                      Auto-detect
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Test Voice Quick Button */}
          <TouchableOpacity
            style={styles.testVoiceBtn}
            onPress={() => router.push('/voice-lab')}
            activeOpacity={0.8}
          >
            <MicIcon size={16} color={colors.white} />
            <Text style={styles.testVoiceBtnText}>Test Voice in Voice Lab</Text>
          </TouchableOpacity>

          <View style={styles.card}>

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
                thumbColor={colors.white}
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
                thumbColor={colors.white}
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
              <Text style={styles.suggestionsTitle}>Suggestions from Voice Corrections</Text>
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
                        &ldquo;{sug.word}&rdquo; → {cat?.name || 'General'}
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
                  It has been more than 14 days since your last backup. We recommend exporting your data.
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
                <ExportIcon size={16} color={colors.white} />
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
                      <CategoryIcon name={kw.category_icon} color={colors.primary} size={14} variant="plain" />
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
                    <CategoryIcon name={cat.icon} color={cat.color} size={18} variant="plain" />
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

        {/* Section: Developer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.devRow}
              onPress={() => router.push('/gallery' as any)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.devRowTitle}>Component Gallery</Text>
                <Text style={styles.devRowSubtitle}>
                  Preview all UI kit design tokens &amp; components in all states
                </Text>
              </View>
              <Text style={styles.devChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.card, { padding: spacing.lg }]}>
            <Text style={styles.aboutName}>Wini</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Expo SDK 57)</Text>
            <Text style={styles.aboutDesc}>
              Personal, voice-first, local-first finance tracker. Your financial data is stored
              exclusively in local SQLite on your phone. No accounts, no cloud tracking, no subscriptions.
            </Text>
          </View>
        </View>
      </View>

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
    </Screen>
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
    color: colors.white,
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
  engineTabsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  engineTab: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  engineTabActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  engineTabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  engineTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  engineTabSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  whisperModelSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  whisperHeaderRow: {
    marginBottom: 4,
  },
  whisperSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  whisperSectionDesc: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  modelCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modelSelectArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  modelNameWrap: {
    flex: 1,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modelName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  badgeDefault: {
    backgroundColor: `${colors.primary}22`,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.round,
  },
  badgeRec: {
    backgroundColor: `${colors.income}22`,
    color: colors.income,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.round,
  },
  modelDesc: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modelActionArea: {
    marginLeft: spacing.sm,
  },
  downloadingPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: `${colors.primary}18`,
  },
  downloadingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  downloadModelBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  downloadModelBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteModelBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: `${colors.expense}14`,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  testVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  testVoiceBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  devRowTitle: {
    color: colors.text,
    fontSize: typography.sizeBase,
    fontWeight: '600',
    fontFamily: typography.bodyMedium,
  },
  devRowSubtitle: {
    color: colors.muted,
    fontSize: typography.sizeSm,
    marginTop: 2,
    fontFamily: typography.body,
  },
  devChevron: {
    color: colors.muted,
    fontSize: typography.sizeXl,
  },
  langModeWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  langModeTextWrap: {
    marginBottom: spacing.sm,
  },
  langModeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  langModeSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  langButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  langBtnActive: {
    backgroundColor: `${colors.primary}22`,
    borderColor: colors.primary,
  },
  langBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  limitPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  limitPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitPillText: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
  },
});
