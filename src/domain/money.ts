/**
 * Money utilities for Wini: conversions and Indian currency formatting.
 * Where it fits: Used by UI components to display human-friendly amounts and
 * by the database/parser layers to convert user input into exact integer paise.
 *
 * Beginner note: In computers, 0.1 + 0.2 === 0.30000000000000004 because binary
 * cannot represent certain base-10 fractions exactly. In financial software,
 * standard practice is to store the smallest currency unit (paise or cents) as
 * integers so addition and subtraction are always 100% exact.
 */

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    // Strip commas, spaces, currency symbols
    const cleanStr = rupees.replace(/[₹,\s]/g, '').trim();
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees) || rupees < 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

/**
 * Format Indian number grouping: 1,23,456.78
 */
function formatIndianInteger(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const lastThree = intStr.substring(intStr.length - 3);
  const rest = intStr.substring(0, intStr.length - 3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return formattedRest + ',' + lastThree;
}

export function formatRupees(paise: number, showSign = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  let formattedNumber: string;
  if (absPaise % 100 === 0) {
    const rupees = Math.floor(absPaise / 100);
    formattedNumber = formatIndianInteger(rupees.toString());
  } else {
    const rupees = Math.floor(absPaise / 100);
    const paisePart = String(absPaise % 100).padStart(2, '0');
    formattedNumber = `${formatIndianInteger(rupees.toString())}.${paisePart}`;
  }

  const sign = isNegative ? '-' : showSign && paise > 0 ? '+' : '';
  return `${sign}₹${formattedNumber}`;
}
