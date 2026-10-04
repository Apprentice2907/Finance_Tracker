// Stress test suite covering 45+ realistic Indian daily life voice sentences and edge cases.
import { parseUtterance } from '../parseUtterance';
import { getRelativeDateIndia } from '../../domain/dates';

describe('Parser Stress Tests: 40+ Real-Life Indian Utterances', () => {
  const FIXED_NOW = new Date('2026-10-04T12:00:00Z'); // Sunday Oct 4, 2026, 17:30 IST
  const YESTERDAY = getRelativeDateIndia(-1, FIXED_NOW);
  const DAY_BEFORE = getRelativeDateIndia(-2, FIXED_NOW);

  // Group 1: Quantity words with prices
  describe('Group 1: Quantity words with prices', () => {
    test('"2 chai 20 rupees"', () => {
      const res = parseUtterance('2 chai 20 rupees', FIXED_NOW);
      expect(res.amountPaise).toBe(2000);
      expect(res.category).toBe('Food');
      expect(res.note).toContain('2 Chai');
    });

    test('"3 samosa 60 rs"', () => {
      const res = parseUtterance('3 samosa 60 rs', FIXED_NOW);
      expect(res.amountPaise).toBe(6000);
      expect(res.category).toBe('Food');
      expect(res.note).toContain('3 Samosa');
    });

    test('"4 plates momos 240"', () => {
      const res = parseUtterance('4 plates momos 240', FIXED_NOW);
      expect(res.amountPaise).toBe(24000);
      expect(res.category).toBe('Food');
    });

    test('"10 tickets 1500 movie"', () => {
      const res = parseUtterance('10 tickets 1500 movie', FIXED_NOW);
      expect(res.amountPaise).toBe(150000);
      expect(res.category).toBe('Fun');
    });

    test('"two cold coffees 300 rupees"', () => {
      const res = parseUtterance('two cold coffees 300 rupees', FIXED_NOW);
      expect(res.amountPaise).toBe(30000);
      expect(res.category).toBe('Food');
    });
  });

  // Group 2: Personal names
  describe('Group 2: Person names and peer transfers', () => {
    test('"paid rahul 500"', () => {
      const res = parseUtterance('paid rahul 500', FIXED_NOW);
      expect(res.amountPaise).toBe(50000);
      expect(res.note).toBe('Rahul');
    });

    test('"sent rohit 1200"', () => {
      const res = parseUtterance('sent rohit 1200', FIXED_NOW);
      expect(res.amountPaise).toBe(120000);
      expect(res.note).toBe('Sent Rohit');
    });

    test('"priya 350 lunch"', () => {
      const res = parseUtterance('priya 350 lunch', FIXED_NOW);
      expect(res.amountPaise).toBe(35000);
      expect(res.category).toBe('Food');
      expect(res.note).toBe('Priya Lunch');
    });

    test('"gave ankit 2000"', () => {
      const res = parseUtterance('gave ankit 2000', FIXED_NOW);
      expect(res.amountPaise).toBe(200000);
      expect(res.note).toBe('Gave Ankit');
    });

    test('"splitwise aman 450"', () => {
      const res = parseUtterance('splitwise aman 450', FIXED_NOW);
      expect(res.amountPaise).toBe(45000);
      expect(res.note).toBe('Splitwise Aman');
    });
  });

  // Group 3: Places and destinations
  describe('Group 3: Places and destinations', () => {
    test('"uber 250 airport"', () => {
      const res = parseUtterance('uber 250 airport', FIXED_NOW);
      expect(res.amountPaise).toBe(25000);
      expect(res.category).toBe('Transport');
      expect(res.note).toBe('Uber Airport');
    });

    test('"auto 180 railway station"', () => {
      const res = parseUtterance('auto 180 railway station', FIXED_NOW);
      expect(res.amountPaise).toBe(18000);
      expect(res.category).toBe('Transport');
      expect(res.note).toBe('Auto Railway Station');
    });

    test('"metro 40 connaught place"', () => {
      const res = parseUtterance('metro 40 connaught place', FIXED_NOW);
      expect(res.amountPaise).toBe(4000);
      expect(res.category).toBe('Transport');
      expect(res.note).toBe('Metro Connaught Place');
    });

    test('"cab 600 indiranagar"', () => {
      const res = parseUtterance('cab 600 indiranagar', FIXED_NOW);
      expect(res.amountPaise).toBe(60000);
      expect(res.category).toBe('Transport');
      expect(res.note).toBe('Cab Indiranagar');
    });

    test('"rapido 85 cyber hub"', () => {
      const res = parseUtterance('rapido 85 cyber hub', FIXED_NOW);
      expect(res.amountPaise).toBe(8500);
      expect(res.category).toBe('Transport');
      expect(res.note).toBe('Rapido Cyber Hub');
    });
  });

  // Group 4: Hinglish word orders and daily phrases
  describe('Group 4: Hinglish word order', () => {
    test('"chai aur samosa 40"', () => {
      const res = parseUtterance('chai aur samosa 40', FIXED_NOW);
      expect(res.amountPaise).toBe(4000);
      expect(res.category).toBe('Food');
    });

    test('"petrol kal 500"', () => {
      const res = parseUtterance('petrol kal 500', FIXED_NOW);
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Transport');
      expect(res.date).toBe(YESTERDAY);
    });

    test('"dosa 80 rupaye"', () => {
      const res = parseUtterance('dosa 80 rupaye', FIXED_NOW);
      expect(res.amountPaise).toBe(8000);
      expect(res.category).toBe('Food');
    });

    test('"bijli bill 1400"', () => {
      const res = parseUtterance('bijli bill 1400', FIXED_NOW);
      expect(res.amountPaise).toBe(140000);
      expect(res.category).toBe('Bills');
    });

    test('"paani cylinder 1100"', () => {
      const res = parseUtterance('paani cylinder 1100', FIXED_NOW);
      expect(res.amountPaise).toBe(110000);
      expect(res.category).toBe('Bills');
    });
  });

  // Group 5: Amounts with commas, decimals, and symbols
  describe('Group 5: Amounts with commas and decimals', () => {
    test('"paid 3,450.75 bill"', () => {
      const res = parseUtterance('paid 3,450.75 bill', FIXED_NOW);
      expect(res.amountPaise).toBe(345075);
      expect(res.category).toBe('Bills');
    });

    test('"1,200.50 groceries"', () => {
      const res = parseUtterance('1,200.50 groceries', FIXED_NOW);
      expect(res.amountPaise).toBe(120050);
      expect(res.category).toBe('Food');
    });

    test('"₹4,500 maintenance"', () => {
      const res = parseUtterance('₹4,500 maintenance', FIXED_NOW);
      expect(res.amountPaise).toBe(450000);
      expect(res.category).toBe('Bills');
    });

    test('"85.50 petrol"', () => {
      const res = parseUtterance('85.50 petrol', FIXED_NOW);
      expect(res.amountPaise).toBe(8550);
      expect(res.category).toBe('Transport');
    });

    test('"15,000 rent transferred"', () => {
      const res = parseUtterance('15,000 rent transferred', FIXED_NOW);
      expect(res.amountPaise).toBe(1500000);
      expect(res.category).toBe('Bills');
    });
  });

  // Group 6: "k" and "lakh" multiplier expressions
  describe('Group 6: "k" and "lakh" multipliers', () => {
    test('"1.2k clothes"', () => {
      const res = parseUtterance('1.2k clothes', FIXED_NOW);
      expect(res.amountPaise).toBe(120000);
      expect(res.category).toBe('Shopping');
    });

    test('"3 lakh car downpayment"', () => {
      const res = parseUtterance('3 lakh car downpayment', FIXED_NOW);
      expect(res.amountPaise).toBe(30000000);
    });

    test('"2.5 lakh college fee"', () => {
      const res = parseUtterance('2.5 lakh college fee', FIXED_NOW);
      expect(res.amountPaise).toBe(25000000);
    });

    test('"5k shopping myntra"', () => {
      const res = parseUtterance('5k shopping myntra', FIXED_NOW);
      expect(res.amountPaise).toBe(500000);
      expect(res.category).toBe('Shopping');
    });

    test('"0.8k dinner"', () => {
      const res = parseUtterance('0.8k dinner', FIXED_NOW);
      expect(res.amountPaise).toBe(80000);
      expect(res.category).toBe('Food');
    });
  });

  // Group 7: Multiple numbers in one sentence
  describe('Group 7: Multiple numbers in one sentence', () => {
    test('"room 101 rent 15000"', () => {
      const res = parseUtterance('room 101 rent 15000', FIXED_NOW);
      expect(res.amountPaise).toBe(1500000);
      expect(res.category).toBe('Bills');
      expect(res.note).toContain('Room 101');
    });

    test('"table 4 dinner 1200"', () => {
      const res = parseUtterance('table 4 dinner 1200', FIXED_NOW);
      expect(res.amountPaise).toBe(120000);
      expect(res.category).toBe('Food');
      expect(res.note).toContain('Table 4');
    });

    test('"flat 204 maintenance 3500"', () => {
      const res = parseUtterance('flat 204 maintenance 3500', FIXED_NOW);
      expect(res.amountPaise).toBe(350000);
      expect(res.category).toBe('Bills');
      expect(res.note).toContain('Flat 204');
    });

    test('"bus 504 ticket 25"', () => {
      const res = parseUtterance('bus 504 ticket 25', FIXED_NOW);
      expect(res.amountPaise).toBe(2500);
      expect(res.category).toBe('Transport');
    });

    test('"2 pizzas 599 rupees"', () => {
      const res = parseUtterance('2 pizzas 599 rupees', FIXED_NOW);
      expect(res.amountPaise).toBe(59900);
      expect(res.category).toBe('Food');
    });
  });

  // Group 8: Income phrases
  describe('Group 8: Income phrases', () => {
    test('"stipend credited 15000"', () => {
      const res = parseUtterance('stipend credited 15000', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(1500000);
      expect(res.category).toBe('Income');
    });

    test('"cashback 50 received"', () => {
      const res = parseUtterance('cashback 50 received', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(5000);
      expect(res.category).toBe('Income');
    });

    test('"freelance payment 25000 aaya"', () => {
      const res = parseUtterance('freelance payment 25000 aaya', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(2500000);
      expect(res.category).toBe('Income');
    });

    test('"bonus 50000 mila"', () => {
      const res = parseUtterance('bonus 50000 mila', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(5000000);
      expect(res.category).toBe('Income');
    });

    test('"dividend 1800 credited"', () => {
      const res = parseUtterance('dividend 1800 credited', FIXED_NOW);
      expect(res.type).toBe('income');
      expect(res.amountPaise).toBe(180000);
      expect(res.category).toBe('Income');
    });
  });

  // Group 9: Relative dates & everyday Indian services
  describe('Group 9: Relative dates and services', () => {
    test('"kal 80 auto"', () => {
      const res = parseUtterance('kal 80 auto', FIXED_NOW);
      expect(res.amountPaise).toBe(8000);
      expect(res.category).toBe('Transport');
      expect(res.date).toBe(YESTERDAY);
    });

    test('"parso 400 groceries"', () => {
      const res = parseUtterance('parso 400 groceries', FIXED_NOW);
      expect(res.amountPaise).toBe(40000);
      expect(res.category).toBe('Food');
      expect(res.date).toBe(DAY_BEFORE);
    });

    test('"wednesday 150 snacks"', () => {
      // Oct 4, 2026 is Sunday. Most recent Wednesday was Sep 30, 2026 (-4 days)
      const res = parseUtterance('wednesday 150 snacks', FIXED_NOW);
      expect(res.amountPaise).toBe(15000);
      expect(res.category).toBe('Food');
      expect(res.date).toBe('2026-09-30');
    });

    test('"last night 450 pizza"', () => {
      const res = parseUtterance('last night 450 pizza', FIXED_NOW);
      expect(res.amountPaise).toBe(45000);
      expect(res.category).toBe('Food');
      expect(res.date).toBe(YESTERDAY);
    });

    test('"zepto 320 milk and bread"', () => {
      const res = parseUtterance('zepto 320 milk and bread', FIXED_NOW);
      expect(res.amountPaise).toBe(32000);
      expect(res.category).toBe('Food');
    });

    test('"blinkit 180 curd"', () => {
      const res = parseUtterance('blinkit 180 curd', FIXED_NOW);
      expect(res.amountPaise).toBe(18000);
      expect(res.category).toBe('Food');
    });

    test('"fastag recharge 500"', () => {
      const res = parseUtterance('fastag recharge 500', FIXED_NOW);
      expect(res.amountPaise).toBe(50000);
      expect(res.category).toBe('Transport');
    });
  });
});
