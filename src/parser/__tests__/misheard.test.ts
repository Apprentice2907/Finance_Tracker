/**
 * Tests for speech recognizer mishearing corrections, homophone disambiguation,
 * fuzzy keyword matching, and alternative selection.
 */

import { parseUtterance, parseBestAlternative } from '../parseUtterance';
import { levenshteinDistance, fuzzyMatchKeyword } from '../misheard';

const FIXED_DATE = new Date('2026-10-04T12:00:00.000Z');

describe('Speech Mishearings & Phonetic Normalization (Part B)', () => {
  describe('1. Levenshtein Distance & Fuzzy Matcher', () => {
    test('calculates correct edit distance', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('chai', 'chai')).toBe(0);
      expect(levenshteinDistance('chai', 'chay')).toBe(1);
      expect(levenshteinDistance('ricksha', 'rickshaw')).toBe(1);
      expect(levenshteinDistance('pertol', 'petrol')).toBe(2);
      expect(levenshteinDistance('swigi', 'swiggy')).toBe(2);
    });

    test('fuzzy matches words with 4+ characters within threshold', () => {
      const candidates = ['rickshaw', 'metro', 'petrol', 'diesel', 'groceries'];
      expect(fuzzyMatchKeyword('metor', candidates)).toBe('metro');
      expect(fuzzyMatchKeyword('rickshw', candidates)).toBe('rickshaw');
      expect(fuzzyMatchKeyword('deisel', candidates)).toBe('diesel');
      expect(fuzzyMatchKeyword('grocreis', candidates)).toBe('groceries');
    });

    test('does NOT fuzzy match short tokens (< 4 chars)', () => {
      const candidates = ['tea', 'bus', 'cab', 'ola'];
      expect(fuzzyMatchKeyword('to', candidates)).toBeNull();
      expect(fuzzyMatchKeyword('ca', candidates)).toBeNull();
    });

    test('does NOT mangle protected words', () => {
      const candidates = ['game', 'milk', 'free', 'cost'];
      expect(fuzzyMatchKeyword('gave', candidates)).toBeNull();
      expect(fuzzyMatchKeyword('mila', candidates)).toBeNull();
      expect(fuzzyMatchKeyword('team', candidates)).toBeNull();
      expect(fuzzyMatchKeyword('with', candidates)).toBeNull();
    });
  });

  describe('2. Multi-word and Single-word Aliases', () => {
    test('"rick shaw 50" resolves to Transport', () => {
      const res = parseUtterance('rick shaw 50', FIXED_DATE);
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Transport');
    });

    test('"ricksha 40" resolves to Transport', () => {
      const res = parseUtterance('ricksha 40', FIXED_DATE);
      expect(res.amountPaise).toBe(4000);
      expect(res.category).toBe('Transport');
    });

    test('"rickshaw 80" resolves to Transport', () => {
      const res = parseUtterance('rickshaw 80', FIXED_DATE);
      expect(res.amountPaise).toBe(8000);
      expect(res.category).toBe('Transport');
    });

    test('"auto rickshaw 60" resolves to Transport', () => {
      const res = parseUtterance('auto rickshaw 60', FIXED_DATE);
      expect(res.amountPaise).toBe(6000);
      expect(res.category).toBe('Transport');
    });

    test('"e rickshaw 30" resolves to Transport', () => {
      const res = parseUtterance('e rickshaw 30', FIXED_DATE);
      expect(res.amountPaise).toBe(3000);
      expect(res.category).toBe('Transport');
    });

    test('"chay 10" resolves to Food', () => {
      const res = parseUtterance('chay 10', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
    });

    test('"chaai 20" resolves to Food', () => {
      const res = parseUtterance('chaai 20', FIXED_DATE);
      expect(res.amountPaise).toBe(2000);
      expect(res.category).toBe('Food');
    });

    test('"chi 10" resolves to chai Food', () => {
      const res = parseUtterance('chi 10', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
    });

    test('"10 rupees chi" resolves to Food', () => {
      const res = parseUtterance('10 rupees chi', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
    });

    test('"swigi 240" resolves to Food', () => {
      const res = parseUtterance('swigi 240', FIXED_DATE);
      expect(res.amountPaise).toBe(24000);
      expect(res.category).toBe('Food');
    });

    test('"zomatto 450" resolves to Food', () => {
      const res = parseUtterance('zomatto 450', FIXED_DATE);
      expect(res.amountPaise).toBe(45000);
      expect(res.category).toBe('Food');
    });

    test('"blink it 180" resolves to Food', () => {
      const res = parseUtterance('blink it 180', FIXED_DATE);
      expect(res.amountPaise).toBe(18000);
      expect(res.category).toBe('Food');
    });

    test('"deisel 500" resolves to Transport', () => {
      const res = parseUtterance('deisel 500', FIXED_DATE);
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Transport');
    });

    test('"dawa 120" resolves to Health', () => {
      const res = parseUtterance('dawa 120', FIXED_DATE);
      expect(res.amountPaise).toBe(12000);
      expect(res.category).toBe('Health');
    });

    test('"davai 250" resolves to Health', () => {
      const res = parseUtterance('davai 250', FIXED_DATE);
      expect(res.amountPaise).toBe(25000);
      expect(res.category).toBe('Health');
    });

    test('"sabji 80" resolves to Food', () => {
      const res = parseUtterance('sabji 80', FIXED_DATE);
      expect(res.amountPaise).toBe(8000);
      expect(res.category).toBe('Food');
    });

    test('"doodh 65" resolves to Food', () => {
      const res = parseUtterance('doodh 65', FIXED_DATE);
      expect(res.amountPaise).toBe(6500);
      expect(res.category).toBe('Food');
    });

    test('"bijli 1200" resolves to Bills', () => {
      const res = parseUtterance('bijli 1200', FIXED_DATE);
      expect(res.amountPaise).toBe(120000);
      expect(res.category).toBe('Bills');
    });

    test('"kiraya 15000" resolves to Bills', () => {
      const res = parseUtterance('kiraya 15000', FIXED_DATE);
      expect(res.amountPaise).toBe(1500000);
      expect(res.category).toBe('Bills');
    });

    test('"rashan 2500" resolves to Food', () => {
      const res = parseUtterance('rashan 2500', FIXED_DATE);
      expect(res.amountPaise).toBe(250000);
      expect(res.category).toBe('Food');
    });
  });

  describe('3. Hindi Number Phrasing & Word Orders', () => {
    test('"dus rupaye chai" parses to ₹10 Food', () => {
      const res = parseUtterance('dus rupaye chai', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
    });

    test('"das rupee chai" parses to ₹10 Food', () => {
      const res = parseUtterance('das rupee chai', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
    });

    test('"dus rupaye auto" parses to ₹10 Transport', () => {
      const res = parseUtterance('dus rupaye auto', FIXED_DATE);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Transport');
    });

    test('"bees rupaye samosa" parses to ₹20 Food', () => {
      const res = parseUtterance('bees rupaye samosa', FIXED_DATE);
      expect(res.amountPaise).toBe(2000);
      expect(res.category).toBe('Food');
    });

    test('"pachas rupaye petrol" parses to ₹50 Transport', () => {
      const res = parseUtterance('pachas rupaye petrol', FIXED_DATE);
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Transport');
    });

    test('"sau rupaye recharge" parses to ₹100 Bills', () => {
      const res = parseUtterance('sau rupaye recharge', FIXED_DATE);
      expect(res.amountPaise).toBe(10000);
      expect(res.category).toBe('Bills');
    });

    test('"metro fifty" parses to ₹50 Transport', () => {
      const res = parseUtterance('metro fifty', FIXED_DATE);
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Transport');
    });

    test('"fifty rupees metro" parses to ₹50 Transport', () => {
      const res = parseUtterance('fifty rupees metro', FIXED_DATE);
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Transport');
    });

    test('"petrol hundred" parses to ₹100 Transport', () => {
      const res = parseUtterance('petrol hundred', FIXED_DATE);
      expect(res.amountPaise).toBe(10000);
      expect(res.category).toBe('Transport');
    });

    test('"hundred petrol" parses to ₹100 Transport', () => {
      const res = parseUtterance('hundred petrol', FIXED_DATE);
      expect(res.amountPaise).toBe(10000);
      expect(res.category).toBe('Transport');
    });
  });

  describe('4. Homophone Disambiguation & Contextual Rules', () => {
    test('"for chai" with no other number is interpreted as 4 chai', () => {
      const res = parseUtterance('for chai', FIXED_DATE);
      expect(res.amountPaise).toBe(400); // ₹4
      expect(res.category).toBe('Food');
    });

    test('"4 chai" parses directly as ₹4 Food', () => {
      const res = parseUtterance('4 chai', FIXED_DATE);
      expect(res.amountPaise).toBe(400);
      expect(res.category).toBe('Food');
    });

    test('"paid 50 for chai" preserves "for" as preposition and parses ₹50', () => {
      const res = parseUtterance('paid 50 for chai', FIXED_DATE);
      expect(res.amountPaise).toBe(5000); // ₹50, NOT ₹4 or ₹54
      expect(res.category).toBe('Food');
    });

    test('"swiggy 350 for dinner" preserves "for" as preposition', () => {
      const res = parseUtterance('swiggy 350 for dinner', FIXED_DATE);
      expect(res.amountPaise).toBe(35000);
      expect(res.category).toBe('Food');
    });

    test('"spent 200 for petrol" preserves "for" as preposition', () => {
      const res = parseUtterance('spent 200 for petrol', FIXED_DATE);
      expect(res.amountPaise).toBe(20000);
      expect(res.category).toBe('Transport');
    });

    test('"transfer to rohit 500" preserves "to" as preposition and parses ₹500', () => {
      const res = parseUtterance('transfer to rohit 500', FIXED_DATE);
      expect(res.amountPaise).toBe(50000); // ₹500, NOT ₹2
    });

    test('"transferred to rahul 1000" preserves "to" as preposition', () => {
      const res = parseUtterance('transferred to rahul 1000', FIXED_DATE);
      expect(res.amountPaise).toBe(100000);
    });

    test('"too rupees toffee" converts "too" next to rupees to 2', () => {
      const res = parseUtterance('too rupees toffee', FIXED_DATE);
      expect(res.amountPaise).toBe(200);
    });

    test('"to rupees chocolate" converts "to" next to rupees to 2', () => {
      const res = parseUtterance('to rupees chocolate', FIXED_DATE);
      expect(res.amountPaise).toBe(200);
    });

    test('"won rupee coin" converts "won" next to rupee to 1', () => {
      const res = parseUtterance('won rupee coin', FIXED_DATE);
      expect(res.amountPaise).toBe(100);
    });

    test('"team won the match 500" does NOT turn "won" into 1', () => {
      const res = parseUtterance('team won the match 500', FIXED_DATE);
      expect(res.amountPaise).toBe(50000); // ₹500
      expect(res.note.toLowerCase()).toContain('won');
    });

    test('"i ate pizza 250" does NOT turn "ate" into 8', () => {
      const res = parseUtterance('i ate pizza 250', FIXED_DATE);
      expect(res.amountPaise).toBe(25000);
      expect(res.category).toBe('Food');
    });

    test('"ate rupees biscuit" converts "ate" next to rupees to 8', () => {
      const res = parseUtterance('ate rupees biscuit', FIXED_DATE);
      expect(res.amountPaise).toBe(800);
      expect(res.category).toBe('Food');
    });
  });

  describe('5. Conservative Fuzzy Matcher (Negative Tests)', () => {
    test('"gave ankit 2000" does NOT mutate "gave" into "game"', () => {
      const res = parseUtterance('gave ankit 2000', FIXED_DATE);
      expect(res.amountPaise).toBe(200000);
      expect(res.note).toBe('Gave Ankit');
    });

    test('"mila 10000 stipend" does NOT mutate "mila" into "milk"', () => {
      const res = parseUtterance('mila 10000 stipend', FIXED_DATE);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(1000000);
      expect(res.category).toBe('Income');
    });

    test('"pertol 200" fuzzy matches to petrol', () => {
      const res = parseUtterance('pertol 200', FIXED_DATE);
      expect(res.amountPaise).toBe(20000);
      expect(res.category).toBe('Transport');
    });

    test('"metor 40" fuzzy matches to metro', () => {
      const res = parseUtterance('metor 40', FIXED_DATE);
      expect(res.amountPaise).toBe(4000);
      expect(res.category).toBe('Transport');
    });

    test('"grocreis 1200" fuzzy matches to groceries', () => {
      const res = parseUtterance('grocreis 1200', FIXED_DATE);
      expect(res.amountPaise).toBe(120000);
      expect(res.category).toBe('Food');
    });

    test('"vegitables 150" fuzzy matches to vegetables', () => {
      const res = parseUtterance('vegitables 150', FIXED_DATE);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBe('Food');
    });
  });

  describe('6. Alternative Selection (parseBestAlternative)', () => {
    test('selects winning alternative with detected amount and category', () => {
      // First alternative is muddled text without amount; second has proper amount and category
      const alternatives = ['four chain', '4 chai 20 rupees', 'chai'];
      const { bestParsed, bestTranscript } = parseBestAlternative(alternatives, FIXED_DATE);

      expect(bestTranscript).toBe('4 chai 20 rupees');
      expect(bestParsed.amountPaise).toBe(2000);
      expect(bestParsed.category).toBe('Food');
      expect(bestParsed.confidence).toBeGreaterThan(0.8);
    });

    test('preserves first alternative on confidence tie', () => {
      const alternatives = ['chai 20', 'coffee 20'];
      const { bestTranscript } = parseBestAlternative(alternatives, FIXED_DATE);
      expect(bestTranscript).toBe('chai 20');
    });

    test('handles empty or single alternative gracefully', () => {
      const emptyRes = parseBestAlternative([], FIXED_DATE);
      expect(emptyRes.bestTranscript).toBe('');
      expect(emptyRes.bestParsed.amountPaise).toBeNull();

      const singleRes = parseBestAlternative(['auto 50'], FIXED_DATE);
      expect(singleRes.bestTranscript).toBe('auto 50');
      expect(singleRes.bestParsed.amountPaise).toBe(5000);
    });
  });
});
