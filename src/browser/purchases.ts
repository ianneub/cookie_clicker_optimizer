/**
 * Purchase-related browser functions
 */

import { GOLDEN_COOKIE_UPGRADES } from '../core/constants';
import { isBlockedGrandmapocalypseUpgrade, isToggleUpgrade } from '../core/candidates';
import { evaluateGoldenUpgradePriority } from '../core/phase';
import type { Upgrade, GoldenUpgrade, Candidate, CMUpgradeData } from '../types';

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

/**
 * Collect upgrade candidates from Cookie Monster data
 * Excludes toggle upgrades and grandmapocalypse research upgrades
 */
export function collectUpgradeCandidates(
  cmUpgrades: Record<string, CMUpgradeData>,
  gameUpgrades: Record<string, Upgrade>,
  upgradesInStore: Upgrade[],
  currentCookies: number,
  luckyBankScaled: number,
  useLuckyBank: boolean
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const name in cmUpgrades) {
    if (!Object.prototype.hasOwnProperty.call(cmUpgrades, name)) continue;
    const cmUpgrade = cmUpgrades[name];
    const gameUpgrade = gameUpgrades[name];

    if (
      cmUpgrade &&
      gameUpgrade &&
      upgradesInStore.includes(gameUpgrade) &&
      cmUpgrade.pp !== undefined &&
      !isToggleUpgrade(name) &&
      !isBlockedGrandmapocalypseUpgrade(name)
    ) {
      const price = gameUpgrade.getPrice();
      const isAffordable = useLuckyBank
        ? currentCookies >= price + luckyBankScaled
        : currentCookies >= price;
      candidates.push({
        name: name,
        type: 'Upgrade',
        pp: cmUpgrade.pp,
        price: price,
        affordable: isAffordable,
      });
    }
  }

  return candidates;
}
