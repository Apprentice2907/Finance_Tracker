/**
 * Auto-add decision logic for Wini.
 * Where it fits: Pure decision function determining whether a parsed utterance
 * should be auto-saved, routed to the confirmation card, or sent to the manual edit modal.
 *
 * Implements WINI_V2_FEATURES.md Section 4.2:
 * - 'ask': Always show the confirm card (unless low confidence/missing amount -> edit).
 * - 'sure': Auto-save immediately ONLY when:
 *     1. Confidence >= 0.9
 *     2. Amount is present and > 0
 *     3. Category is resolved (non-empty)
 *     4. Amount <= autoAddLimitPaise (default ₹2,000 / 200,000 paise)
 *     5. Date is within the last 7 days (0 <= diff <= 7 days).
 *     Otherwise, show the confirm card (or edit form if low confidence).
 * - 'always': Skip only the confirm card; low confidence/missing amount still opens edit form.
 */

import { ParseResult } from '../parser';
import { getTodayIndia } from './dates';

export type AutoAddMode = 'ask' | 'sure' | 'always';

export interface AutoAddSettings {
  autoAddMode: AutoAddMode;
  autoAddLimitPaise: number;
}

export const DEFAULT_AUTO_ADD_SETTINGS: AutoAddSettings = {
  autoAddMode: 'sure',
  autoAddLimitPaise: 200000, // ₹2,000 in integer paise
};

export type AddAction = 'auto' | 'confirm' | 'edit';

/**
 * Calculates day difference between today and a target YYYY-MM-DD date string.
 * Positive value means past date (e.g. 1 = yesterday).
 * Negative value means future date (e.g. -1 = tomorrow).
 */
export function getDaysAgo(dateStr: string, todayStr: string): number {
  const [targetY, targetM, targetD] = dateStr.split('-').map(Number);
  const [todayY, todayM, todayD] = todayStr.split('-').map(Number);

  const targetUtc = Date.UTC(targetY, targetM - 1, targetD);
  const todayUtc = Date.UTC(todayY, todayM - 1, todayD);

  const diffMs = todayUtc - targetUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Pure function deciding whether to auto-save, show confirmation card, or open edit form.
 */
export function decideAddAction(
  parseResult: ParseResult | null | undefined,
  settings: AutoAddSettings,
  now: Date = new Date(),
  timeZone: string = 'Asia/Kolkata'
): AddAction {
  if (!parseResult) {
    return 'edit';
  }

  const { amountPaise, category, confidence, date } = parseResult;

  // Missing amount or critically low confidence always requires user review in edit form
  if (amountPaise === null || amountPaise <= 0 || confidence < 0.6) {
    return 'edit';
  }

  const mode = settings.autoAddMode || 'sure';
  const limitPaise = settings.autoAddLimitPaise ?? DEFAULT_AUTO_ADD_SETTINGS.autoAddLimitPaise;

  if (mode === 'ask') {
    return 'confirm';
  }

  if (mode === 'always') {
    return 'auto';
  }

  // mode === 'sure'
  const todayStr = getTodayIndia(now);
  const daysAgo = getDaysAgo(date || todayStr, todayStr);
  const isDateWithinLast7Days = daysAgo >= 0 && daysAgo <= 7;

  const isCategoryResolved = Boolean(category && category.trim().length > 0);
  const isConfidenceHigh = confidence >= 0.9;
  const isWithinLimit = amountPaise <= limitPaise;

  if (
    isConfidenceHigh &&
    isCategoryResolved &&
    isWithinLimit &&
    isDateWithinLast7Days
  ) {
    return 'auto';
  }

  return 'confirm';
}
