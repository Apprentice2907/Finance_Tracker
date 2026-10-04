/**
 * Devanagari Script Transliteration & Normalization for Wini.
 * Where it fits: Pre-processing layer for voice transcripts when speech recognizers
 * (like Whisper or multilingual models) output Hindi/Hinglish in Devanagari script
 * rather than Romanized English.
 *
 * Beginner note: Whisper sometimes recognizes words like "chai" as "चाय", "20" as "बीस",
 * and "rupees" as "रुपये". This file maps common Devanagari words into their Latin/Romanized
 * equivalents so our standard parser can understand them without needing a completely separate pipeline!
 */

// Devanagari number words to digits
export const DEVANAGARI_NUMBERS: Record<string, string> = {
  एक: '1',
  दो: '2',
  तीन: '3',
  चार: '4',
  पांच: '5',
  पाँच: '5',
  छह: '6',
  छः: '6',
  सात: '7',
  आठ: '8',
  नौ: '9',
  दस: '10',
  ग्यारह: '11',
  बारह: '12',
  तेरह: '13',
  चौदह: '14',
  पंद्रह: '15',
  सोलह: '16',
  सत्रह: '17',
  अठारह: '18',
  उन्नीस: '19',
  बीस: '20',
  तीस: '30',
  चालीस: '40',
  पचास: '50',
  साठ: '60',
  सत्तर: '70',
  अस्सी: '80',
  नब्बे: '90',
  सौ: '100',
  हजार: '1000',
  हज़ार: '1000',
  लाख: '100000',
  करोड़: '10000000',
  // Devanagari numeric digits (०-९)
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

// Devanagari currency words
export const DEVANAGARI_CURRENCY: Record<string, string> = {
  रुपये: 'rupees',
  रुपया: 'rupees',
  रुपए: 'rupees',
  रुपे: 'rupees',
  रुपिया: 'rupees',
  रुपिये: 'rupees',
  रु: 'rupees',
  रू: 'rupees',
};

// Devanagari date terms
export const DEVANAGARI_DATES: Record<string, string> = {
  आज: 'today',
  कल: 'kal',
  परसों: 'parso',
  परसो: 'parso',
  तरसों: 'tarso',
};

// Common Devanagari category keywords
export const DEVANAGARI_KEYWORDS: Record<string, string> = {
  // Food
  चाय: 'chai',
  कॉफी: 'coffee',
  कॉफ़ी: 'coffee',
  खाना: 'food',
  लंच: 'lunch',
  डिनर: 'dinner',
  नाश्ता: 'breakfast',
  समोसा: 'samosa',
  समोसे: 'samosa',
  दूध: 'milk',
  सब्जी: 'vegetables',
  सब्जियां: 'vegetables',
  राशन: 'groceries',
  किराना: 'groceries',
  फल: 'fruits',
  पानी: 'water',
  बिस्कुट: 'biscuit',

  // Transport
  रिक्शा: 'rickshaw',
  रिक्शावा: 'rickshaw',
  ऑटो: 'auto',
  मेट्रो: 'metro',
  बस: 'bus',
  ट्रेन: 'train',
  पेट्रोल: 'petrol',
  डीजल: 'diesel',
  गाड़ी: 'car',
  किराया: 'rent',

  // Bills & Health
  बिजली: 'electricity',
  दवा: 'medicine',
  दवाई: 'medicine',
  दवाइयां: 'medicine',
  बिल: 'bill',
  रिचार्ज: 'recharge',
};

// Pre-compiled regex for Devanagari characters
const DEVANAGARI_CHAR_REGEX = /[\u0900-\u097F]/;

/**
 * Checks if a string contains any Devanagari script characters.
 */
export function containsDevanagari(text: string): boolean {
  return DEVANAGARI_CHAR_REGEX.test(text);
}

/**
 * Transliterates Devanagari words and digits to Romanized English/digits
 * so the standard Wini parser can process them accurately.
 */
export function transliterateDevanagari(text: string): string {
  if (!text || !containsDevanagari(text)) return text;

  // Replace Devanagari numerals (०-९) directly
  let normalized = text.replace(/[\u0966-\u096F]/g, (digit) => {
    return DEVANAGARI_NUMBERS[digit] || digit;
  });

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const transliterated = tokens.map((token) => {
    // Strip trailing punctuation
    const match = token.match(/^([\u0900-\u097Fa-zA-Z0-9]+)([.,!?;:]*)$/);
    const word = match ? match[1] : token;
    const punct = match ? match[2] : '';

    if (DEVANAGARI_NUMBERS[word]) {
      return DEVANAGARI_NUMBERS[word] + punct;
    }
    if (DEVANAGARI_CURRENCY[word]) {
      return DEVANAGARI_CURRENCY[word] + punct;
    }
    if (DEVANAGARI_DATES[word]) {
      return DEVANAGARI_DATES[word] + punct;
    }
    if (DEVANAGARI_KEYWORDS[word]) {
      return DEVANAGARI_KEYWORDS[word] + punct;
    }

    return token;
  });

  return transliterated.join(' ');
}
