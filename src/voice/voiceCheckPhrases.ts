/**
 * Standard 50-phrase benchmark suite for Wini Voice Check.
 * Where it fits: Used by Settings -> Voice Check and automated Jest parser verification.
 *
 * Implements WINI_V2_FEATURES.md Appendix.
 */

import { TransactionType } from '../domain/types';

export interface VoiceCheckPhrase {
  id: number;
  phrase: string;
  expectedType: TransactionType;
  expectedAmountPaise: number;
  expectedCategory: string;
  expectedDateOffsetDays: number; // 0 = today, -1 = yesterday, -2 = day before yesterday
  expectedAccountAlias?: string;
}

export const VOICE_CHECK_PHRASES: VoiceCheckPhrase[] = [
  { id: 1, phrase: 'add 10 rupees rickshaw', expectedType: 'expense', expectedAmountPaise: 1000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 2, phrase: 'rickshaw 10', expectedType: 'expense', expectedAmountPaise: 1000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 3, phrase: 'add rickshaw 10 rupees', expectedType: 'expense', expectedAmountPaise: 1000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 4, phrase: 'auto 40', expectedType: 'expense', expectedAmountPaise: 4000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 5, phrase: 'metro 30', expectedType: 'expense', expectedAmountPaise: 3000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 6, phrase: 'uber 250 airport', expectedType: 'expense', expectedAmountPaise: 25000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 7, phrase: 'ola 180', expectedType: 'expense', expectedAmountPaise: 18000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 8, phrase: 'rapido 60', expectedType: 'expense', expectedAmountPaise: 6000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 9, phrase: 'petrol 500', expectedType: 'expense', expectedAmountPaise: 50000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 10, phrase: 'chai 20', expectedType: 'expense', expectedAmountPaise: 2000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 11, phrase: 'shake 80', expectedType: 'expense', expectedAmountPaise: 8000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 12, phrase: 'milkshake 120', expectedType: 'expense', expectedAmountPaise: 12000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 13, phrase: 'add lunch 150', expectedType: 'expense', expectedAmountPaise: 15000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 14, phrase: 'swiggy 320', expectedType: 'expense', expectedAmountPaise: 32000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 15, phrase: 'zomato 450', expectedType: 'expense', expectedAmountPaise: 45000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 16, phrase: 'blinkit 280', expectedType: 'expense', expectedAmountPaise: 28000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 17, phrase: 'zepto 199', expectedType: 'expense', expectedAmountPaise: 19900, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 18, phrase: 'bigbasket 1200', expectedType: 'expense', expectedAmountPaise: 120000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 19, phrase: 'biryani 220', expectedType: 'expense', expectedAmountPaise: 22000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 20, phrase: 'dinner 600 yesterday', expectedType: 'expense', expectedAmountPaise: 60000, expectedCategory: 'Food', expectedDateOffsetDays: -1 },
  { id: 21, phrase: 'amazon 799', expectedType: 'expense', expectedAmountPaise: 79900, expectedCategory: 'Shopping', expectedDateOffsetDays: 0 },
  { id: 22, phrase: 'flipkart 1499', expectedType: 'expense', expectedAmountPaise: 149900, expectedCategory: 'Shopping', expectedDateOffsetDays: 0 },
  { id: 23, phrase: 'myntra 899', expectedType: 'expense', expectedAmountPaise: 89900, expectedCategory: 'Shopping', expectedDateOffsetDays: 0 },
  { id: 24, phrase: 'shoes 2k', expectedType: 'expense', expectedAmountPaise: 200000, expectedCategory: 'Shopping', expectedDateOffsetDays: 0 },
  { id: 25, phrase: 'netflix 199', expectedType: 'expense', expectedAmountPaise: 19900, expectedCategory: 'Fun', expectedDateOffsetDays: 0 },
  { id: 26, phrase: 'spotify 119', expectedType: 'expense', expectedAmountPaise: 11900, expectedCategory: 'Fun', expectedDateOffsetDays: 0 },
  { id: 27, phrase: 'movie 350', expectedType: 'expense', expectedAmountPaise: 35000, expectedCategory: 'Fun', expectedDateOffsetDays: 0 },
  { id: 28, phrase: 'jio recharge 299', expectedType: 'expense', expectedAmountPaise: 29900, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 29, phrase: 'airtel recharge 399', expectedType: 'expense', expectedAmountPaise: 39900, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 30, phrase: 'electricity bill 1850', expectedType: 'expense', expectedAmountPaise: 185000, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 31, phrase: 'rent 15000', expectedType: 'expense', expectedAmountPaise: 1500000, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 32, phrase: 'wifi 700', expectedType: 'expense', expectedAmountPaise: 70000, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 33, phrase: 'emi 5200', expectedType: 'expense', expectedAmountPaise: 520000, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 34, phrase: 'medicine 240', expectedType: 'expense', expectedAmountPaise: 24000, expectedCategory: 'Health', expectedDateOffsetDays: 0 },
  { id: 35, phrase: 'doctor 500', expectedType: 'expense', expectedAmountPaise: 50000, expectedCategory: 'Health', expectedDateOffsetDays: 0 },
  { id: 36, phrase: 'gym 1500', expectedType: 'expense', expectedAmountPaise: 150000, expectedCategory: 'Health', expectedDateOffsetDays: 0 },
  { id: 37, phrase: 'dedh sau chai', expectedType: 'expense', expectedAmountPaise: 15000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 38, phrase: 'dhai sau petrol', expectedType: 'expense', expectedAmountPaise: 25000, expectedCategory: 'Transport', expectedDateOffsetDays: 0 },
  { id: 39, phrase: 'do hazaar rent', expectedType: 'expense', expectedAmountPaise: 200000, expectedCategory: 'Bills', expectedDateOffsetDays: 0 },
  { id: 40, phrase: 'paanch sau groceries', expectedType: 'expense', expectedAmountPaise: 50000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 41, phrase: 'das rupaye chai', expectedType: 'expense', expectedAmountPaise: 1000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
  { id: 42, phrase: 'kal 100 petrol', expectedType: 'expense', expectedAmountPaise: 10000, expectedCategory: 'Transport', expectedDateOffsetDays: -1 },
  { id: 43, phrase: 'parso 50 metro', expectedType: 'expense', expectedAmountPaise: 5000, expectedCategory: 'Transport', expectedDateOffsetDays: -2 },
  { id: 44, phrase: '1.5 lakh hospital', expectedType: 'expense', expectedAmountPaise: 15000000, expectedCategory: 'Health', expectedDateOffsetDays: 0 },
  { id: 45, phrase: 'got 5000 salary', expectedType: 'income', expectedAmountPaise: 500000, expectedCategory: 'Income', expectedDateOffsetDays: 0 },
  { id: 46, phrase: 'salary 50000 credited', expectedType: 'income', expectedAmountPaise: 5000000, expectedCategory: 'Income', expectedDateOffsetDays: 0 },
  { id: 47, phrase: 'received 500 cashback', expectedType: 'income', expectedAmountPaise: 50000, expectedCategory: 'Income', expectedDateOffsetDays: 0 },
  { id: 48, phrase: 'chai 20 from cash', expectedType: 'expense', expectedAmountPaise: 2000, expectedCategory: 'Food', expectedDateOffsetDays: 0, expectedAccountAlias: 'Cash' },
  { id: 49, phrase: 'paid 1250 from hdfc electricity', expectedType: 'expense', expectedAmountPaise: 125000, expectedCategory: 'Bills', expectedDateOffsetDays: 0, expectedAccountAlias: 'HDFC' },
  { id: 50, phrase: '2 chai 20 rupees', expectedType: 'expense', expectedAmountPaise: 2000, expectedCategory: 'Food', expectedDateOffsetDays: 0 },
];
