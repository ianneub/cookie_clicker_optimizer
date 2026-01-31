/**
 * Ascension calculation logic
 */

import type { AscensionInput, AscensionStats, HeavenlyUpgradeBreakdown } from '../types';
import { formatNumber } from './formatting';

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

/**
 * Calculate detailed breakdown of unpurchased heavenly upgrades
 */
export function calculateHeavenlyUpgradeBreakdown(
  upgrades: Array<{ name: string; pool?: string; basePrice: number; bought: boolean }>,
  heavenlyChips: number
): HeavenlyUpgradeBreakdown {
  const unpurchased = upgrades
    .filter((u) => u.pool === 'prestige' && !u.bought)
    .map((u) => ({
      name: u.name,
      cost: u.basePrice,
      costFormatted: formatNumber(u.basePrice),
      canAfford: heavenlyChips >= u.basePrice,
    }))
    .sort((a, b) => a.cost - b.cost);

  const totalCost = unpurchased.reduce((sum, u) => sum + u.cost, 0);
  const chipsNeeded = Math.max(0, totalCost - heavenlyChips);

  return {
    totalCost,
    totalCostFormatted: formatNumber(totalCost),
    chipsAvailable: heavenlyChips,
    chipsAvailableFormatted: formatNumber(heavenlyChips),
    chipsNeeded,
    chipsNeededFormatted: formatNumber(chipsNeeded),
    upgrades: unpurchased,
  };
}
