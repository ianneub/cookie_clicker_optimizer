/**
 * Purchase-related browser functions
 */

import { GOLDEN_COOKIE_UPGRADES } from '../core/constants';
import { evaluateGoldenUpgradePriority } from '../core/phase';
import type { Upgrade, GoldenUpgrade } from '../types';

/**
 * Find golden cookie upgrades in store with phase-aware priority
 */
export function findGoldenUpgradesInStore(
  upgradesInStore: Upgrade[],
  currentCookies: number,
  currentCpS: number,
  phaseProgress: number
): GoldenUpgrade[] {
  const available: GoldenUpgrade[] = [];

  for (const upgrade of upgradesInStore) {
    if (GOLDEN_COOKIE_UPGRADES.has(upgrade.name)) {
      const price = upgrade.getPrice();
      const evaluation = evaluateGoldenUpgradePriority(phaseProgress, price, currentCpS);
      available.push({
        name: upgrade.name,
        type: 'GoldenUpgrade',
        price: price,
        affordable: currentCookies >= price,
        prioritized: evaluation.shouldPrioritize,
        deferReason: evaluation.reason,
        hoursToAfford: evaluation.hoursToAfford,
        gameUpgrade: upgrade,
      });
    }
  }

  // Sort: prioritized first, then by price
  return available.sort((a, b) => {
    if (a.prioritized !== b.prioritized) {
      return a.prioritized ? -1 : 1;
    }
    return a.price - b.price;
  });
}
