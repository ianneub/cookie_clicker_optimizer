/**
 * Lucky bank threshold calculations
 */

import { calculatePhaseProgress, getPhaseName, getScaledLuckyBank } from './phase';
import type { CMCache, LuckyBankInfo } from '../types';

/**
 * Get the base Lucky bank threshold from Cookie Monster's cache (unscaled)
 * Uses 6000x CpS - the bank needed for max Lucky reward (without Frenzy)
 */
export function getBaseLuckyBank(cmCache: CMCache | null | undefined, cps: number): number {
  if (cmCache && typeof cmCache.Lucky === 'number' && cmCache.Lucky > 0) {
    return cmCache.Lucky;
  }
  return 6000 * cps;
}

/**
 * Get the phase-scaled Lucky bank threshold
 * In early game, returns 0 (no protection). Scales up through mid game.
 */
export function getLuckyBank(
  cmCache: CMCache | null | undefined,
  cps: number
): LuckyBankInfo {
  const base = getBaseLuckyBank(cmCache, cps);
  const phaseProgress = calculatePhaseProgress(cps);
  const scaled = getScaledLuckyBank(base, phaseProgress);
  return {
    scaled,
    base,
    phaseProgress,
    phaseName: getPhaseName(phaseProgress),
  };
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
