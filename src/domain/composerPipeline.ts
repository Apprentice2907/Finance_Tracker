/**
 * Composer Input Pipeline for Wini.
 * Where it fits: Pure logic handling both voice and typed inputs before routing to auto-add, confirm, or edit.
 *
 * Implements WINI_DESIGN_DECISIONS.md Section 1.6 & WINI_V2_FEATURES.md Section 4.1:
 * - Both spoken voice transcripts and typed sentences pass through the exact same parser pipeline.
 * - Supports single transcript or multiple recognizer alternatives.
 */

import { parseBestAlternative, ParseResult } from '../parser';

export interface ProcessComposerInputOptions {
  text: string;
  source: 'voice' | 'typed';
  alternatives?: string[];
  now?: Date;
  timeZone?: string;
  keywordMap?: Record<string, string>;
}

export interface ProcessedComposerInput {
  parsed: ParseResult;
  effectiveTranscript: string;
  candidates: string[];
  source: 'voice' | 'typed';
}

/**
 * Standard pure pipeline to parse any spoken or typed composer input.
 */
export function processComposerInput(
  options: ProcessComposerInputOptions
): ProcessedComposerInput {
  const {
    text,
    source,
    alternatives,
    now = new Date(),
    timeZone = 'Asia/Kolkata',
    keywordMap = {},
  } = options;

  const trimmedText = text.trim();
  const rawCandidates =
    alternatives && alternatives.length > 0 ? alternatives : [trimmedText];
  const candidates = rawCandidates
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const effectiveCandidates = candidates.length > 0 ? candidates : [trimmedText];

  const { bestParsed, bestTranscript } = parseBestAlternative(
    effectiveCandidates,
    now,
    timeZone,
    keywordMap
  );

  return {
    parsed: bestParsed,
    effectiveTranscript: bestTranscript || trimmedText,
    candidates: effectiveCandidates,
    source,
  };
}
