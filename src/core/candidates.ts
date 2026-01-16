/**
 * Candidate filtering and evaluation
 */

import { GOLDEN_COOKIE_UPGRADES, GRANDMAPOCALYPSE_UPGRADES, TOGGLE_UPGRADES } from './constants';
import type { Candidate } from '../types';

/**
 * Filter out invalid candidates and sort by PP (lower is better)
 */
export function filterAndSortCandidates(candidates: readonly Candidate[]): Candidate[] {
  return candidates
    .filter((c) => Number.isFinite(c.pp) && c.pp > 0)
    .sort((a, b) => a.pp - b.pp);
}

/**
 * Check if an upgrade is a golden cookie upgrade
 */
export function isGoldenCookieUpgrade(upgradeName: string): boolean {
  return GOLDEN_COOKIE_UPGRADES.has(upgradeName);
}

/**
 * Check if an upgrade is a toggle/repeatable upgrade (excluded from optimization)
 */
export function isToggleUpgrade(upgradeName: string): boolean {
  return TOGGLE_UPGRADES.has(upgradeName);
}

/**
 * Check if an upgrade is a grandmapocalypse research upgrade (excluded from optimization)
 */
export function isGrandmapocalypseUpgrade(upgradeName: string): boolean {
  return GRANDMAPOCALYPSE_UPGRADES.has(upgradeName);
}
