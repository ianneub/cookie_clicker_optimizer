/**
 * Ascension calculation logic
 */

import type { AscensionInput, AscensionStats } from '../types';

/**
 * Calculate ascension statistics
 */
export function calculateAscensionStats(input: AscensionInput): AscensionStats {
  const totalCookies = input.cookiesReset + input.cookiesEarned;
  const totalPrestige = input.howMuchPrestige(totalCookies);
  const pendingPrestige = Math.max(0, totalPrestige - input.currentPrestige);
  const percentIncrease =
    input.currentPrestige > 0
      ? (pendingPrestige / input.currentPrestige) * 100
      : pendingPrestige > 0
        ? Infinity
        : 0;
  const chipsDeficit = Math.max(0, input.unpurchasedUpgradeCost - input.heavenlyChips);

  return {
    currentPrestige: input.currentPrestige,
    pendingPrestige,
    percentIncrease,
    unpurchasedUpgradeCost: input.unpurchasedUpgradeCost,
    chipsDeficit,
    isGoodToAscend: percentIncrease >= 100,
  };
}

/**
 * Calculate cost of unpurchased heavenly upgrades
 */
export function calculateUnpurchasedHeavenlyCost(
  upgrades: Array<{ pool?: string; basePrice: number; bought: boolean }>
): number {
  return upgrades
    .filter((u) => u.pool === 'prestige' && !u.bought)
    .reduce((sum, u) => sum + u.basePrice, 0);
}
