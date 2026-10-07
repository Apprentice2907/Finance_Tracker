import { parseUtterance, ParseResult } from '../../parser';
import { VOICE_CHECK_PHRASES, VoiceCheckPhrase } from '../voiceCheckPhrases';
import { getRelativeDateIndia } from '../../domain/dates';

describe('Voice Check 50-Phrase Parser Verification', () => {
  const fixedNow = new Date('2026-10-07T12:00:00.000Z');

  const accountAliases: Record<string, string> = {
    cash: 'Cash',
    hdfc: 'HDFC',
  };

  VOICE_CHECK_PHRASES.forEach((p: VoiceCheckPhrase) => {
    test(`[#${p.id}] "${p.phrase}" -> ${p.expectedType} ₹${p.expectedAmountPaise / 100} (${p.expectedCategory})`, () => {
      const result: ParseResult = parseUtterance(
        p.phrase,
        fixedNow,
        'Asia/Kolkata',
        {},
        accountAliases
      );

      const expectedDate = getRelativeDateIndia(p.expectedDateOffsetDays, fixedNow);

      expect(result.type).toBe(p.expectedType);
      expect(result.amountPaise).toBe(p.expectedAmountPaise);
      expect(result.category?.toLowerCase()).toBe(p.expectedCategory.toLowerCase());
      expect(result.date).toBe(expectedDate);

      if (p.expectedAccountAlias) {
        expect(result.accountAlias?.toLowerCase()).toBe(p.expectedAccountAlias.toLowerCase());
      }
    });
  });
});
