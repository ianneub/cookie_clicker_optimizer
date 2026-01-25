/**
 * Formatting and logging utilities
 */

/** Number suffixes from largest to smallest */
const NUMBER_SUFFIXES: readonly { threshold: number; suffix: string }[] = [
  { threshold: 1e63, suffix: 'vigintillion' },
  { threshold: 1e60, suffix: 'novemdecillion' },
  { threshold: 1e57, suffix: 'octodecillion' },
  { threshold: 1e54, suffix: 'septendecillion' },
  { threshold: 1e51, suffix: 'sexdecillion' },
  { threshold: 1e48, suffix: 'quindecillion' },
  { threshold: 1e45, suffix: 'quattuordecillion' },
  { threshold: 1e42, suffix: 'tredecillion' },
  { threshold: 1e39, suffix: 'duodecillion' },
  { threshold: 1e36, suffix: 'undecillion' },
  { threshold: 1e33, suffix: 'decillion' },
  { threshold: 1e30, suffix: 'nonillion' },
  { threshold: 1e27, suffix: 'octillion' },
  { threshold: 1e24, suffix: 'septillion' },
  { threshold: 1e21, suffix: 'sextillion' },
  { threshold: 1e18, suffix: 'quintillion' },
  { threshold: 1e15, suffix: 'quadrillion' },
  { threshold: 1e12, suffix: 'trillion' },
  { threshold: 1e9, suffix: 'billion' },
  { threshold: 1e6, suffix: 'million' },
  { threshold: 1e3, suffix: 'thousand' },
] as const;

/**
 * Format large numbers in a readable way
 */
export function formatNumber(num: number): string {
  for (const { threshold, suffix } of NUMBER_SUFFIXES) {
    if (num >= threshold) {
      return (num / threshold).toFixed(2) + ' ' + suffix;
    }
  }
  return num.toFixed(0);
}

/**
 * Log an action with timestamp and data
 */
export function logAction(action: string, data: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.log('[CCOptimizer]', JSON.stringify({ timestamp, action, ...data }));
}
