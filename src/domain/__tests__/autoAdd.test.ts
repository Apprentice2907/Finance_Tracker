import { decideAddAction, AutoAddSettings, getDaysAgo } from '../autoAdd';
import { ParseResult } from '../../parser';

describe('decideAddAction', () => {
  const fixedNow = new Date('2026-10-07T12:00:00.000Z'); // 2026-10-07 in IST
  const todayYmd = '2026-10-07';

  const createBaseResult = (overrides: Partial<ParseResult> = {}): ParseResult => ({
    type: 'expense',
    amountPaise: 5000, // ₹50
    category: 'Food',
    note: 'Chai',
    date: todayYmd,
    confidence: 0.95,
    ...overrides,
  });

  const sureSettings: AutoAddSettings = {
    autoAddMode: 'sure',
    autoAddLimitPaise: 200000, // ₹2,000
  };

  const askSettings: AutoAddSettings = {
    autoAddMode: 'ask',
    autoAddLimitPaise: 200000,
  };

  const alwaysSettings: AutoAddSettings = {
    autoAddMode: 'always',
    autoAddLimitPaise: 200000,
  };

  describe('getDaysAgo helper', () => {
    test('returns 0 for today', () => {
      expect(getDaysAgo('2026-10-07', '2026-10-07')).toBe(0);
    });

    test('returns 1 for yesterday', () => {
      expect(getDaysAgo('2026-10-06', '2026-10-07')).toBe(1);
    });

    test('returns 7 for exactly 7 days ago', () => {
      expect(getDaysAgo('2026-09-30', '2026-10-07')).toBe(7);
    });

    test('returns 8 for 8 days ago', () => {
      expect(getDaysAgo('2026-09-29', '2026-10-07')).toBe(8);
    });

    test('returns negative number for future date', () => {
      expect(getDaysAgo('2026-10-08', '2026-10-07')).toBe(-1);
    });
  });

  describe('Mode: "sure" (Auto-add when sure)', () => {
    test('1. returns "auto" when all 5 conditions are met', () => {
      const result = createBaseResult();
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('2. boundary: confidence = 0.90 returns "auto"', () => {
      const result = createBaseResult({ confidence: 0.9 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('3. boundary: confidence = 0.89 returns "confirm"', () => {
      const result = createBaseResult({ confidence: 0.89 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('4. boundary: amount at exact limit (₹2,000 / 200,000 paise) returns "auto"', () => {
      const result = createBaseResult({ amountPaise: 200000 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('5. boundary: amount 1 paisa over limit (200,001 paise) returns "confirm"', () => {
      const result = createBaseResult({ amountPaise: 200001 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('6. boundary: date is exactly today (0 days ago) returns "auto"', () => {
      const result = createBaseResult({ date: '2026-10-07' });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('7. boundary: date is yesterday (1 day ago) returns "auto"', () => {
      const result = createBaseResult({ date: '2026-10-06' });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('8. boundary: date is exactly 7 days ago returns "auto"', () => {
      const result = createBaseResult({ date: '2026-09-30' });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('9. boundary: date is 8 days ago returns "confirm"', () => {
      const result = createBaseResult({ date: '2026-09-29' });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('10. boundary: future date (tomorrow) returns "confirm"', () => {
      const result = createBaseResult({ date: '2026-10-08' });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('11. missing category returns "confirm" (when confidence is moderate)', () => {
      const result = createBaseResult({ category: null, confidence: 0.8 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('12. empty string category returns "confirm"', () => {
      const result = createBaseResult({ category: '', confidence: 0.95 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('13. missing amount (null) returns "edit"', () => {
      const result = createBaseResult({ amountPaise: null, confidence: 0.95 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('edit');
    });

    test('14. amount <= 0 returns "edit"', () => {
      const result = createBaseResult({ amountPaise: 0, confidence: 0.95 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('edit');
    });

    test('15. critically low confidence (< 0.6) returns "edit"', () => {
      const result = createBaseResult({ confidence: 0.55 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('edit');
    });

    test('16. boundary: confidence = 0.60 with moderate info returns "confirm"', () => {
      const result = createBaseResult({ confidence: 0.60 });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('confirm');
    });

    test('17. income entry with all conditions met returns "auto"', () => {
      const result = createBaseResult({
        type: 'income',
        category: 'Income',
        amountPaise: 50000,
        confidence: 0.95,
      });
      expect(decideAddAction(result, sureSettings, fixedNow)).toBe('auto');
    });

    test('18. custom auto-add limit (e.g. ₹500) applies correctly', () => {
      const customSettings: AutoAddSettings = {
        autoAddMode: 'sure',
        autoAddLimitPaise: 50000, // ₹500
      };
      const withinCustom = createBaseResult({ amountPaise: 40000 });
      const overCustom = createBaseResult({ amountPaise: 60000 });

      expect(decideAddAction(withinCustom, customSettings, fixedNow)).toBe('auto');
      expect(decideAddAction(overCustom, customSettings, fixedNow)).toBe('confirm');
    });
  });

  describe('Mode: "ask" (Ask me every time)', () => {
    test('19. returns "confirm" for high confidence input', () => {
      const result = createBaseResult({ confidence: 0.99, amountPaise: 1000 });
      expect(decideAddAction(result, askSettings, fixedNow)).toBe('confirm');
    });

    test('20. returns "confirm" for small amounts and today date', () => {
      const result = createBaseResult({ amountPaise: 1000, date: todayYmd });
      expect(decideAddAction(result, askSettings, fixedNow)).toBe('confirm');
    });

    test('21. returns "edit" if amount is missing even in ask mode', () => {
      const result = createBaseResult({ amountPaise: null });
      expect(decideAddAction(result, askSettings, fixedNow)).toBe('edit');
    });

    test('22. returns "edit" if confidence is low (< 0.6) in ask mode', () => {
      const result = createBaseResult({ confidence: 0.4 });
      expect(decideAddAction(result, askSettings, fixedNow)).toBe('edit');
    });
  });

  describe('Mode: "always" (Always auto-add)', () => {
    test('23. returns "auto" even if amount exceeds default limit', () => {
      const result = createBaseResult({ amountPaise: 500000, confidence: 0.75 });
      expect(decideAddAction(result, alwaysSettings, fixedNow)).toBe('auto');
    });

    test('24. returns "auto" even if date is older than 7 days', () => {
      const result = createBaseResult({ date: '2026-08-01', confidence: 0.8 });
      expect(decideAddAction(result, alwaysSettings, fixedNow)).toBe('auto');
    });

    test('25. returns "edit" if confidence is low (< 0.6) in always mode', () => {
      const result = createBaseResult({ confidence: 0.5 });
      expect(decideAddAction(result, alwaysSettings, fixedNow)).toBe('edit');
    });

    test('26. returns "edit" if amount is missing in always mode', () => {
      const result = createBaseResult({ amountPaise: null });
      expect(decideAddAction(result, alwaysSettings, fixedNow)).toBe('edit');
    });

    test('27. returns "edit" when parseResult is null or undefined', () => {
      expect(decideAddAction(null, sureSettings, fixedNow)).toBe('edit');
      expect(decideAddAction(undefined, sureSettings, fixedNow)).toBe('edit');
    });
  });
});
