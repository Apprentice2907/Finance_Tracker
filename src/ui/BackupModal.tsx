import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from './tokens';
import { BackupPreview, restoreBackupData } from '../backup/backupService';
import { useAppStore } from '../state/useAppStore';

interface BackupModalProps {
  visible: boolean;
  preview: BackupPreview | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  preview,
  onClose,
  onSuccess,
}) => {
  const refresh = useAppStore((state) => state.refresh);
  const [restoring, setRestoring] = useState(false);

  if (!preview) return null;

  const handleRestore = async (mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      Alert.alert(
        'Confirm Replace',
        'Are you sure you want to replace all existing data? All existing transactions on this device will be erased.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Replace',
            style: 'destructive',
            onPress: () => executeRestore(mode),
          },
        ]
      );
      return;
    }

    await executeRestore(mode);
  };

  const executeRestore = async (mode: 'merge' | 'replace') => {
    setRestoring(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await restoreBackupData(preview.data, mode);
      if (res.success) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSuccess(
          `Restored ${res.importedTransactions} transactions, ${res.importedCategories} categories.`
        );
        onClose();
      } else {
        Alert.alert('Restore Failed', res.error || 'Failed to restore backup data.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred during restore.');
    } finally {
      setRestoring(false);
    }
  };

  const formattedExportDate = new Date(preview.exportedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Restore Backup 📦</Text>
          <Text style={styles.subtitle}>
            Verified Wini v1 Backup from {formattedExportDate}
          </Text>

          {/* Counts Grid */}
          <View style={styles.countsGrid}>
            <View style={styles.countBox}>
              <Text style={styles.countValue}>{preview.transactionCount}</Text>
              <Text style={styles.countLabel}>Transactions</Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countValue}>{preview.categoryCount}</Text>
              <Text style={styles.countLabel}>Categories</Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countValue}>{preview.keywordCount}</Text>
              <Text style={styles.countLabel}>Keywords</Text>
            </View>
          </View>

          <Text style={styles.prompt}>
            How would you like to restore this backup?
          </Text>

          {restoring ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Restoring financial records...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              {/* Merge Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnMerge]}
                onPress={() => handleRestore('merge')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnMergeText}>Merge with Existing</Text>
                <Text style={styles.btnSub}>Keep existing data, newest record wins</Text>
              </TouchableOpacity>

              {/* Replace Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnReplace]}
                onPress={() => handleRestore('replace')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnReplaceText}>Replace Everything</Text>
                <Text style={styles.btnSub}>Erase device data and replace from file</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.bodyBold,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  countsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  countBox: {
    flex: 1,
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  countValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.displaySerif,
  },
  countLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  prompt: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  btnMerge: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  btnMergeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnReplace: {
    backgroundColor: colors.expenseMuted,
    borderColor: colors.expense,
  },
  btnReplaceText: {
    color: colors.expense,
    fontSize: 14,
    fontWeight: '700',
  },
  btnSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  btnCancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnCancelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
