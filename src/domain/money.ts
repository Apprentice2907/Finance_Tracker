/**
 * Money utilities for Wini.
 * All monetary amounts in the database and state are strictly integer paise (1 Rupee = 100 paise).
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
