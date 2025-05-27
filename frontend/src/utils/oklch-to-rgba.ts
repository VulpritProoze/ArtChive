import * as culori from 'culori';

/**
 * Converts an Oklch color string to an RGBA CSS string.
 *
 * @param {string} oklchStr - The Oklch color string (e.g., "oklch(75% 0.1 50)")
 * @param {number} [alpha=1] - Optional alpha value (0 to 1)
 * @returns {string} - RGBA CSS string
 */
export function oklchToRgba(oklchStr: string, alpha: number = 1): string {
  const color = culori.parse(oklchStr);
  if (!color) throw new Error(`Invalid Oklch string: ${oklchStr}`);

  const rgbaColor = culori.formatRgb({ ...color, alpha });
  return rgbaColor;
}