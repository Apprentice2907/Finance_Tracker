/**
 * Backup export and import service for Wini.
 * Where it fits: Bridges the Settings screen to native file systems (`expo-file-system`),
 * document pickers (`expo-document-picker`), and the Android share sheet (`expo-sharing`).
 *
 * Beginner note: Why use `expo-sharing` instead of saving directly to phone storage?
 * Android 11+ uses "Scoped Storage" to protect user privacy—apps cannot write directly
 * to public folders without dangerous permissions. Writing the file to app cache and
 * sharing it via the Android share sheet lets users save their data anywhere (Google Drive,
 * WhatsApp, Downloads) safely without requiring any special storage permissions!
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getRepository } from '../db';
import { getTodayIndia } from '../domain/dates';
import { validateBackupData } from './validation';
import { BackupData } from '../domain/types';

export interface BackupPreview {
  categoryCount: number;
  transactionCount: number;
  keywordCount: number;
  exportedAt: string;
  data: BackupData;
}

/**
 * Exports all database records as a single JSON file and prompts the system share dialog.
 */
export async function exportBackupFile(): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    const repo = getRepository();
    const backupData = await repo.getAllDataForBackup();
    const today = getTodayIndia();
    const fileName = `wini-backup-${today}.json`;
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!baseDir) {
      throw new Error('Local storage directory is unavailable.');
    }
    const fileUri = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Wini Backup',
        UTI: 'public.json',
      });
    }

    // Save timestamp of backup in database
    await repo.setSetting('last_backup_at', new Date().toISOString());

    return { success: true, filePath: fileUri };
  } catch (err: any) {
    console.error('Error exporting backup:', err);
    return { success: false, error: err?.message || 'Failed to export backup' };
  }
}

/**
 * Opens the system document picker, reads the selected JSON file, and validates it against the schema.
 */
export async function pickAndValidateBackupFile(): Promise<{
  success: boolean;
  canceled?: boolean;
  preview?: BackupPreview;
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, canceled: true };
    }

    const asset = result.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const validation = validateBackupData(fileContent);
    if (!validation.success || !validation.data) {
      return {
        success: false,
        error: validation.error || 'Invalid backup file structure.',
      };
    }

    const data = validation.data;
    return {
      success: true,
      preview: {
        categoryCount: data.categories.length,
        transactionCount: data.transactions.length,
        keywordCount: data.keywordMap.length,
        exportedAt: data.exportedAt,
        data,
      },
    };
  } catch (err: any) {
    console.error('Error picking/validating backup file:', err);
    return { success: false, error: err?.message || 'Failed to read backup file' };
  }
}

/**
 * Restores a validated backup into SQLite with either 'merge' or 'replace' strategy.
 */
export async function restoreBackupData(
  data: BackupData,
  mode: 'merge' | 'replace'
): Promise<{
  success: boolean;
  importedCategories: number;
  importedTransactions: number;
  importedKeywords: number;
  error?: string;
}> {
  try {
    const repo = getRepository();
    const result = await repo.restoreBackup(data, mode);
    await repo.setSetting('last_backup_at', new Date().toISOString());
    return {
      success: true,
      ...result,
    };
  } catch (err: any) {
    console.error('Error restoring backup:', err);
    return {
      success: false,
      importedCategories: 0,
      importedTransactions: 0,
      importedKeywords: 0,
      error: err?.message || 'Failed to restore backup',
    };
  }
}
