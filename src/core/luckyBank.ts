/**
 * Lucky bank threshold calculations
 */

import {
  LUCKY_BANK_CPS_CAP_MULTIPLIER,
  LUCKY_BANK_PRICE_MULTIPLIER,
  PHASE_THRESHOLDS,
} from './constants';

/**
 * Get the Lucky bank threshold based on best item price
 * Returns min(price × 3, cps × 6000) to keep enough reserve for purchasing
 * Disabled in early game (< 1M CpS) where Lucky cookies aren't significant
 */
export function getLuckyBank(bestItemPrice: number | undefined, cps: number): number {
  if (!bestItemPrice || bestItemPrice <= 0) return 0;
  // Skip lucky bank in early game - Lucky cookies aren't significant yet
  if (cps < PHASE_THRESHOLDS.EARLY_TO_MID) return 0;
  const priceBasedBank = bestItemPrice * LUCKY_BANK_PRICE_MULTIPLIER;
  const cpsCap = cps * LUCKY_BANK_CPS_CAP_MULTIPLIER;
  return Math.floor(Math.min(priceBasedBank, cpsCap));
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
