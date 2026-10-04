/**
 * Schema validation logic for Wini JSON backup files.
 * Where it fits: Runs when importing a backup file before handing data to `Repository.restoreBackup`.
 *
 * Beginner note: "Defensive Programming"! Never trust user-provided files blindly.
 * If someone uploads an empty file, a photo, or JSON from another app, passing it to
 * SQLite could corrupt your database. This validator checks every key, array, and data
 * type to guarantee the file is a genuine, healthy Wini backup.
 */

import type { BackupData } from '../domain/types';

export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: BackupData;
}

/**
 * Validates a parsed or raw JSON object against the Wini v1 Backup Schema.
 */
export function validateBackupData(input: unknown): ValidationResult {
  let parsed: any = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { success: false, error: 'File is not valid JSON.' };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, error: 'Backup data must be a JSON object.' };
  }

  if (parsed.app !== 'wini') {
    return {
      success: false,
      error: `Invalid application identifier: expected "wini", found "${parsed.app}".`,
    };
  }

  if (parsed.schemaVersion !== 1) {
    return {
      success: false,
      error: `Unsupported schema version: expected 1, found ${parsed.schemaVersion}.`,
    };
  }

  if (!parsed.exportedAt || typeof parsed.exportedAt !== 'string') {
    return { success: false, error: 'Missing or invalid "exportedAt" timestamp.' };
  }

  if (!parsed.deviceId || typeof parsed.deviceId !== 'string') {
    return { success: false, error: 'Missing or invalid "deviceId" identifier.' };
  }

  // Validate categories
  if (!Array.isArray(parsed.categories)) {
    return { success: false, error: 'Missing or invalid "categories" array.' };
  }

  for (let i = 0; i < parsed.categories.length; i++) {
    const c = parsed.categories[i];
    if (!c || typeof c !== 'object') {
      return { success: false, error: `Category at index ${i} is not an object.` };
    }
    if (!c.id || typeof c.id !== 'string') {
      return { success: false, error: `Category at index ${i} is missing a valid "id".` };
    }
    if (!c.name || typeof c.name !== 'string') {
      return { success: false, error: `Category "${c.id}" is missing a valid "name".` };
    }
    if (c.kind !== 'expense' && c.kind !== 'income') {
      return { success: false, error: `Category "${c.name}" has invalid kind "${c.kind}".` };
    }
  }

  // Validate transactions
  if (!Array.isArray(parsed.transactions)) {
    return { success: false, error: 'Missing or invalid "transactions" array.' };
  }

  for (let i = 0; i < parsed.transactions.length; i++) {
    const t = parsed.transactions[i];
    if (!t || typeof t !== 'object') {
      return { success: false, error: `Transaction at index ${i} is not an object.` };
    }
    if (!t.id || typeof t.id !== 'string') {
      return { success: false, error: `Transaction at index ${i} is missing a valid "id".` };
    }
    if (t.type !== 'expense' && t.type !== 'income') {
      return { success: false, error: `Transaction "${t.id}" has invalid type "${t.type}".` };
    }
    if (typeof t.amount_paise !== 'number' || !Number.isInteger(t.amount_paise) || t.amount_paise <= 0) {
      return {
        success: false,
        error: `Transaction "${t.id}" must have a positive integer amount_paise (found ${t.amount_paise}).`,
      };
    }
    if (!t.category_id || typeof t.category_id !== 'string') {
      return { success: false, error: `Transaction "${t.id}" is missing "category_id".` };
    }
    if (!t.occurred_on || typeof t.occurred_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.occurred_on)) {
      return {
        success: false,
        error: `Transaction "${t.id}" has invalid "occurred_on" date format (expected YYYY-MM-DD).`,
      };
    }
  }

  // Validate keywordMap
  if (!Array.isArray(parsed.keywordMap)) {
    return { success: false, error: 'Missing or invalid "keywordMap" array.' };
  }

  for (let i = 0; i < parsed.keywordMap.length; i++) {
    const k = parsed.keywordMap[i];
    if (!k || typeof k !== 'object') {
      return { success: false, error: `Keyword entry at index ${i} is not an object.` };
    }
    if (!k.word || typeof k.word !== 'string') {
      return { success: false, error: `Keyword entry at index ${i} is missing "word".` };
    }
    if (!k.category_id || typeof k.category_id !== 'string') {
      return { success: false, error: `Keyword "${k.word}" is missing "category_id".` };
    }
  }

  return {
    success: true,
    data: parsed as BackupData,
  };
}
