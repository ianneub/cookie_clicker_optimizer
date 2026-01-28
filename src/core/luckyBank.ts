/**
 * Lucky bank threshold calculations
 */

import { LUCKY_BANK_PRICE_MULTIPLIER } from './constants';

/**
 * Get the Lucky bank threshold based on best item price
 * Returns price × multiplier to keep enough reserve for purchasing
 */
export function getLuckyBank(bestItemPrice: number | undefined): number {
  if (!bestItemPrice || bestItemPrice <= 0) return 0;
  return Math.floor(bestItemPrice * LUCKY_BANK_PRICE_MULTIPLIER);
}

/**
 * Check if a purchase would drop cookies below the Lucky bank threshold
 */
export function canAffordWithLuckyBank(
  currentCookies: number,
  price: number,
  luckyBank: number
): boolean {
  return currentCookies - price >= luckyBank;
}
