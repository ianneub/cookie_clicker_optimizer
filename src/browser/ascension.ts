/**
 * Browser integration for ascension stats
 */

import {
  calculateAscensionStats,
  calculateUnpurchasedHeavenlyCost,
  calculateHeavenlyUpgradeBreakdown,
} from '../core/ascension';
import type { AscensionStats, HeavenlyUpgradeBreakdown, Upgrade } from '../types';

export interface AscensionGameContext {
  prestige: number;
  cookiesReset: number;
  cookiesEarned: number;
  heavenlyChips: number;
  HowMuchPrestige: (cookies: number) => number;
  Upgrades: Record<string, Upgrade>;
}

/**
 * Get ascension stats from game context
 * Returns null if player hasn't ascended yet (prestige === 0)
 */
export function getAscensionStats(game: AscensionGameContext): AscensionStats | null {
  if (game.prestige === 0) return null;

  const upgrades = Object.values(game.Upgrades);
  const unpurchasedCost = calculateUnpurchasedHeavenlyCost(upgrades);

  return calculateAscensionStats({
    currentPrestige: game.prestige,
    cookiesReset: game.cookiesReset,
    cookiesEarned: game.cookiesEarned,
    howMuchPrestige: game.HowMuchPrestige,
    heavenlyChips: game.heavenlyChips,
    unpurchasedUpgradeCost: unpurchasedCost,
  });
}

/**
 * Get detailed breakdown of unpurchased heavenly upgrades
 * Returns null if player hasn't ascended yet (prestige === 0)
 */
export function getHeavenlyUpgradeBreakdown(
  game: AscensionGameContext
): HeavenlyUpgradeBreakdown | null {
  if (game.prestige === 0) return null;

  const upgrades = Object.values(game.Upgrades);
  return calculateHeavenlyUpgradeBreakdown(upgrades, game.heavenlyChips);
}
