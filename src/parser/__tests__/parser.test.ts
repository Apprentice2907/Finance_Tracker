import { parseUtterance } from '../parseUtterance';
import { getTodayIndia, getRelativeDateIndia } from '../../domain/dates';

describe('Voice Sentence Parser (Phase 2)', () => {
  // Use a fixed reference Date in UTC corresponding to Oct 4, 2026, 12:00:00 UTC (17:30 IST)
  const FIXED_NOW = new Date('2026-10-04T12:00:00Z');
  const TODAY_IST = getTodayIndia(FIXED_NOW);
  const YESTERDAY_IST = getRelativeDateIndia(-1, FIXED_NOW);
  const DAY_BEFORE_IST = getRelativeDateIndia(-2, FIXED_NOW);

  describe('1. Required Acceptance Cases from Specification', () => {
    test('1. "add 10 rupees rickshaw"', () => {
      const res = parseUtterance('add 10 rupees rickshaw', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.note).toBe('Rickshaw');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('2. "add rickshaw 10 rupees"', () => {
      const res = parseUtterance('add rickshaw 10 rupees', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.note).toBe('Rickshaw');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('3. "rickshaw 10"', () => {
      const res = parseUtterance('rickshaw 10', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('4. "10 rs chai"', () => {
      const res = parseUtterance('10 rs chai', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('5. "spent 250 on lunch yesterday"', () => {
      const res = parseUtterance('spent 250 on lunch yesterday', FIXED_NOW);
      expect(res.amountPaise).toBe(25000);
      expect(res.category).toBe('Food');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(YESTERDAY_IST);
      expect(res.note).toBe('Lunch');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('6. "got 5000 salary"', () => {
      const res = parseUtterance('got 5000 salary', FIXED_NOW);
      expect(res.amountPaise).toBe(500000);
      expect(res.category).toBe('Income');
      expect(res.type).toBe('income');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('7. "ten rupees auto"', () => {
      const res = parseUtterance('ten rupees auto', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('8. "das rupaye chai"', () => {
      const res = parseUtterance('das rupaye chai', FIXED_NOW);
      expect(res.amountPaise).toBe(1000);
      expect(res.category).toBe('Food');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('9. "kal 100 petrol"', () => {
      const res = parseUtterance('kal 100 petrol', FIXED_NOW);
      expect(res.amountPaise).toBe(10000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(YESTERDAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('10. "parso 50 metro"', () => {
      const res = parseUtterance('parso 50 metro', FIXED_NOW);
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Transport');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(DAY_BEFORE_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('11. "paid 1,250 rent"', () => {
      const res = parseUtterance('paid 1,250 rent', FIXED_NOW);
      expect(res.amountPaise).toBe(125000);
      expect(res.category).toBe('Bills');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('12. "2k shoes"', () => {
      const res = parseUtterance('2k shoes', FIXED_NOW);
      expect(res.amountPaise).toBe(200000);
      expect(res.category).toBe('Shopping');
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('13. "asdf qwerty" (garbage input)', () => {
      const res = parseUtterance('asdf qwerty', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
      expect(res.category).toBeNull();
      expect(res.type).toBe('expense');
      expect(res.date).toBe(TODAY_IST);
      expect(res.confidence).toBeLessThanOrEqual(0.2);
    });
  });

  describe('2. English & Hindi Number Words', () => {
    test('"twenty five rupees snacks"', () => {
      const res = parseUtterance('twenty five rupees snacks', FIXED_NOW);
      expect(res.amountPaise).toBe(2500);
      expect(res.category).toBe('Food');
    });

    test('"one hundred fifty swiggy"', () => {
      const res = parseUtterance('one hundred fifty swiggy', FIXED_NOW);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBe('Food');
    });

    test('"two thousand wifi"', () => {
      const res = parseUtterance('two thousand wifi', FIXED_NOW);
      expect(res.amountPaise).toBe(200000);
      expect(res.category).toBe('Bills');
    });

    test('"ek sau pachas zomato"', () => {
      const res = parseUtterance('ek sau pachas zomato', FIXED_NOW);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBe('Food');
    });

    test('"dedh sau chai"', () => {
      const res = parseUtterance('dedh sau chai', FIXED_NOW);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBe('Food');
    });

    test('"dhai hazaar electricity"', () => {
      const res = parseUtterance('dhai hazaar electricity', FIXED_NOW);
      expect(res.amountPaise).toBe(250000);
      expect(res.category).toBe('Bills');
    });

    test('"paanch hazaar gym"', () => {
      const res = parseUtterance('paanch hazaar gym', FIXED_NOW);
      expect(res.amountPaise).toBe(500000);
      expect(res.category).toBe('Health');
    });

    test('"bees rupaye parking"', () => {
      const res = parseUtterance('bees rupaye parking', FIXED_NOW);
      expect(res.amountPaise).toBe(2000);
      expect(res.category).toBe('Transport');
    });

    test('"chalis rapido"', () => {
      const res = parseUtterance('chalis rapido', FIXED_NOW);
      expect(res.amountPaise).toBe(4000);
      expect(res.category).toBe('Transport');
    });

    test('"saath rupaye toll"', () => {
      const res = parseUtterance('saath rupaye toll', FIXED_NOW);
      expect(res.amountPaise).toBe(6000);
      expect(res.category).toBe('Transport');
    });
  });

  describe('3. Number Multipliers & Decimals', () => {
    test('"1.5k flipkart"', () => {
      const res = parseUtterance('1.5k flipkart', FIXED_NOW);
      expect(res.amountPaise).toBe(150000);
      expect(res.category).toBe('Shopping');
    });

    test('"2 lakh amazon"', () => {
      const res = parseUtterance('2 lakh amazon', FIXED_NOW);
      expect(res.amountPaise).toBe(20000000);
      expect(res.category).toBe('Shopping');
    });

    test('"1.5 lakh hospital"', () => {
      const res = parseUtterance('1.5 lakh hospital', FIXED_NOW);
      expect(res.amountPaise).toBe(15000000);
      expect(res.category).toBe('Health');
    });

    test('"250.50 groceries"', () => {
      const res = parseUtterance('250.50 groceries', FIXED_NOW);
      expect(res.amountPaise).toBe(25050);
      expect(res.category).toBe('Food');
    });

    test('"₹99.99 netflix"', () => {
      const res = parseUtterance('₹99.99 netflix', FIXED_NOW);
      expect(res.amountPaise).toBe(9999);
      expect(res.category).toBe('Fun');
    });

    test('"500 bucks movie"', () => {
      const res = parseUtterance('500 bucks movie', FIXED_NOW);
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Fun');
    });
  });

  describe('4. Income Sentences', () => {
    test('"received 2000 refund"', () => {
      const res = parseUtterance('received 2000 refund', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(200000);
      expect(res.category).toBe('Income');
    });

    test('"credited 45000 salary"', () => {
      const res = parseUtterance('credited 45000 salary', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(4500000);
      expect(res.category).toBe('Income');
    });

    test('"aaya 500 cashback"', () => {
      const res = parseUtterance('aaya 500 cashback', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Income');
    });

    test('"mila 10000 stipend"', () => {
      const res = parseUtterance('mila 10000 stipend', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(1000000);
      expect(res.category).toBe('Income');
    });

    test('"earned 8000 freelance"', () => {
      const res = parseUtterance('earned 8000 freelance', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(800000);
      expect(res.category).toBe('Income');
    });
  });

  describe('5. Relative & Boundary Dates', () => {
    test('"aaj 50 chai"', () => {
      const res = parseUtterance('aaj 50 chai', FIXED_NOW);
      expect(res.date).toBe(TODAY_IST);
    });

    test('"last night 350 biryani"', () => {
      const res = parseUtterance('last night 350 biryani', FIXED_NOW);
      expect(res.date).toBe(YESTERDAY_IST);
      expect(res.category).toBe('Food');
    });

    test('"day before yesterday 120 medicine"', () => {
      const res = parseUtterance('day before yesterday 120 medicine', FIXED_NOW);
      expect(res.date).toBe(DAY_BEFORE_IST);
      expect(res.category).toBe('Health');
    });

    test('"3 days ago 500 dinner"', () => {
      const res = parseUtterance('3 days ago 500 dinner', FIXED_NOW);
      expect(res.date).toBe(getRelativeDateIndia(-3, FIXED_NOW));
    });

    test('"5 days ago 200 fuel"', () => {
      const res = parseUtterance('5 days ago 200 fuel', FIXED_NOW);
      expect(res.date).toBe(getRelativeDateIndia(-5, FIXED_NOW));
    });

    // Midnight IST boundary test:
    // 2026-10-04 18:30:00 UTC is exactly 2026-10-05 00:00:00 IST (midnight crossing!)
    test('Midnight IST transition', () => {
      const justBeforeMidnight = new Date('2026-10-04T18:29:00Z'); // 23:59 IST Oct 4
      const justAfterMidnight = new Date('2026-10-04T18:31:00Z'); // 00:01 IST Oct 5

      const resBefore = parseUtterance('100 chai', justBeforeMidnight);
      const resAfter = parseUtterance('100 chai', justAfterMidnight);

      expect(resBefore.date).toBe('2026-10-04');
      expect(resAfter.date).toBe('2026-10-05');
    });

    // Month boundary test:
    // When now is Oct 1, 2026, yesterday must be Sep 30, 2026
    test('Month boundary test (Oct 1 -> yesterday Sep 30)', () => {
      const octFirst = new Date('2026-10-01T06:00:00Z'); // 11:30 IST Oct 1
      const res = parseUtterance('kal 250 lunch', octFirst);
      expect(res.date).toBe('2026-09-30');
    });

    // Year boundary test:
    // When now is Jan 1, 2027, yesterday must be Dec 31, 2026
    test('Year boundary test (Jan 1 -> yesterday Dec 31)', () => {
      const janFirst = new Date('2027-01-01T06:00:00Z'); // 11:30 IST Jan 1
      const res = parseUtterance('yesterday 500 party', janFirst);
      expect(res.date).toBe('2026-12-31');
    });

    test('Weekday name resolves to recent past occurrence', () => {
      // FIXED_NOW is 2026-10-04 (Sunday)
      // "saturday" must be yesterday (Oct 3, 2026)
      const res = parseUtterance('saturday 200 cab', FIXED_NOW);
      expect(res.date).toBe('2026-10-03');
    });
  });

  describe('6. Learned Keywords Override & Custom Keywords', () => {
    test('learned keyword overrides built-in category', () => {
      // By default, "petrol" is Transport.
      // Learned keywords maps "petrol" -> "Bills"
      const learned = { petrol: 'Bills' };
      const res = parseUtterance('100 petrol', FIXED_NOW, 'Asia/Kolkata', learned);
      expect(res.category).toBe('Bills');
      expect(res.matchedKeyword).toBe('petrol');
    });

    test('learned keyword works with Map instance', () => {
      const learned = new Map<string, string>();
      learned.set('momo', 'Food');
      const res = parseUtterance('120 momo', FIXED_NOW, 'Asia/Kolkata', learned);
      expect(res.category).toBe('Food');
      expect(res.matchedKeyword).toBe('momo');
    });

    test('new slang or unknown word mapped via learned keywords', () => {
      const learned = { 'tuk tuk': 'Transport', birra: 'Fun' };
      const res1 = parseUtterance('50 tuk tuk', FIXED_NOW, 'Asia/Kolkata', learned);
      expect(res1.category).toBe('Transport');

      const res2 = parseUtterance('300 birra', FIXED_NOW, 'Asia/Kolkata', learned);
      expect(res2.category).toBe('Fun');
    });
  });

  describe('7. Confidence and Note Extraction', () => {
    test('high confidence when amount and category are found', () => {
      const res = parseUtterance('250 pizza', FIXED_NOW);
      expect(res.confidence).toBe(0.95);
    });

    test('medium confidence when amount is found without category', () => {
      const res = parseUtterance('250 randomitem', FIXED_NOW);
      expect(res.amountPaise).toBe(25000);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0.6);
      expect(res.note).toBe('Randomitem');
    });

    test('low confidence when amount is missing', () => {
      const res = parseUtterance('hello world swiggy', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
      expect(res.confidence).toBeLessThanOrEqual(0.2);
    });

    test('proper Title-Casing of note', () => {
      const res = parseUtterance('paid 400 for fresh vegetables at market', FIXED_NOW);
      expect(res.amountPaise).toBe(40000);
      expect(res.category).toBe('Food');
      expect(res.note).toBe('Fresh Vegetables Market');
    });
  });

  describe('8. Robustness and Garbage Input (Must Never Throw)', () => {
    test('handles empty string without throwing', () => {
      expect(() => parseUtterance('', FIXED_NOW)).not.toThrow();
      const res = parseUtterance('', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
      expect(res.confidence).toBe(0);
    });

    test('handles whitespace string without throwing', () => {
      const res = parseUtterance('   \t\n   ', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
    });

    test('handles null/undefined gracefully', () => {
      expect(() => parseUtterance(null as any, FIXED_NOW)).not.toThrow();
      expect(() => parseUtterance(undefined as any, FIXED_NOW)).not.toThrow();
    });

    test('handles special characters and punctuation soup', () => {
      const res = parseUtterance('??? !!! @#$%^&*()', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
      expect(res.confidence).toBeLessThanOrEqual(0.2);
    });

    test('handles amount with punctuation glued', () => {
      const res = parseUtterance('₹500! chai?', FIXED_NOW);
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Food');
    });

    test('handles sentence with only amount', () => {
      const res = parseUtterance('150', FIXED_NOW);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0.6);
    });

    test('handles sentence with only category', () => {
      const res = parseUtterance('rickshaw', FIXED_NOW);
      expect(res.amountPaise).toBeNull();
      expect(res.category).toBe('Transport');
      expect(res.confidence).toBeLessThanOrEqual(0.2);
    });
  });
});
