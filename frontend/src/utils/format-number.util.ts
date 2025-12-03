/**
 * Format number for display, truncating large numbers.
 * 
 * Examples:
 * - 999 → "999"
 * - 1000 → "1k"
 * - 1500 → "1.5k"
 * - 3500 → "3.5k"
 * - 1000000 → "1M"
 * 
 * @param num - Number to format (can be null or undefined)
 * @returns Formatted string (e.g., "1k", "3.5k", "999")
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) {
    return '0';
  }

  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum >= 1000000) {
    const formatted = (absNum / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return isNegative ? `-${formatted}` : formatted;
  }
  
  if (absNum >= 1000) {
    const formatted = (absNum / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return isNegative ? `-${formatted}` : formatted;
  }
  
  return num.toString();
};

