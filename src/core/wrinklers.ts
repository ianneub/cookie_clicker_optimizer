/**
 * Wrinkler calculations
 */

import { WRINKLER_RESPAWN_TIME } from './constants';
import type { Wrinkler, PopDecision } from '../types';

/**
 * Get the wrinkler pop multiplier based on upgrades owned
 * Base: 1.1x (10% gain), +5% from Wrinklerspawn, +5% from Sacrilegious Corruption
 */
export function getWrinklerMultiplier(
  hasWrinklerspawn: boolean,
  hasSacrilegious: boolean
): number {
  let multiplier = 1.1;
  if (hasWrinklerspawn) multiplier *= 1.05;
  if (hasSacrilegious) multiplier *= 1.05;
  return multiplier;
}

/**
 * Calculate total pop reward for non-shiny wrinklers
 */
export function calculateNormalWrinklerReward(
  wrinklers: Wrinkler[],
  multiplier: number
): number {
  let total = 0;
  for (const w of wrinklers) {
    // Only count active wrinklers (phase 2) that are not shiny (type 0)
    if (w.phase === 2 && w.type === 0 && w.sucked > 0) {
      total += w.sucked * multiplier;
    }
  }
  return total;
}

/**
 * Check if popping wrinklers enables a purchase faster than waiting
 * Factors in the opportunity cost of wrinklers being gone during respawn
 */
export function shouldPopForPurchase(
  popReward: number,
  itemPrice: number,
  currentCookies: number,
  cps: number,
  wrinklerCount: number
): PopDecision {
  // If we can already afford it, no need to pop
  if (currentCookies >= itemPrice) {
    return { shouldPop: false, reason: 'Already affordable' };
  }

  // If popping doesn't help us afford it, don't pop
  if (currentCookies + popReward < itemPrice) {
    return { shouldPop: false, reason: 'Pop reward insufficient' };
  }

  // Calculate time to afford without popping
  const needed = itemPrice - currentCookies;
  const timeWithoutPop = needed / cps;

  // Calculate opportunity cost: wrinklers won't be earning during respawn
  const respawnTime = WRINKLER_RESPAWN_TIME * wrinklerCount;

  // Only pop if we save more than the respawn time
  if (timeWithoutPop > respawnTime) {
    return { shouldPop: true, reason: `Saves ${Math.floor(timeWithoutPop - respawnTime)}s` };
  }

  return { shouldPop: false, reason: 'Respawn cost too high' };
}
