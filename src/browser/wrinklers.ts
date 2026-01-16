/**
 * Wrinkler browser functions
 */

import { getWrinklerMultiplier, calculateNormalWrinklerReward } from '../core/wrinklers';
import type { Wrinkler, WrinklerStats } from '../types';

interface WrinklerGameContext {
  wrinklers: Wrinkler[];
  elderWrath: number;
  has: (name: string) => boolean;
  getWrinklersMax?: () => number;
}

/**
 * Get current wrinkler statistics from Game
 */
export function getWrinklerStats(game: WrinklerGameContext | null): WrinklerStats | null {
  if (!game || !game.wrinklers) return null;

  // Check if Grandmapocalypse is active (elderWrath > 0)
  if (game.elderWrath === 0) return null;

  const wrinklers = game.wrinklers;
  let normalCount = 0;
  let shinyCount = 0;
  let totalSucked = 0;

  for (const w of wrinklers) {
    if (w.phase === 2) {
      // Active wrinkler
      if (w.type === 1) {
        shinyCount++;
      } else {
        normalCount++;
      }
      totalSucked += w.sucked;
    }
  }

  // Get wrinkler upgrades
  const hasWrinklerspawn = game.has('Wrinklerspawn');
  const hasSacrilegious = game.has('Sacrilegious corruption');
  const multiplier = getWrinklerMultiplier(hasWrinklerspawn, hasSacrilegious);

  // Calculate pop reward for normal wrinklers only
  const popReward = calculateNormalWrinklerReward(wrinklers, multiplier);

  // Get max wrinklers (10 base + Elder Spice + Dragon Guts)
  const max = game.getWrinklersMax ? game.getWrinklersMax() : 10;

  return {
    count: normalCount + shinyCount,
    max,
    normalCount,
    shinyCount,
    totalSucked,
    popReward,
    multiplier,
  };
}

/**
 * Pop all normal wrinklers (preserves shiny)
 */
export function popNormalWrinklers(wrinklers: Wrinkler[]): number {
  let popped = 0;
  for (const w of wrinklers) {
    // Only pop active normal wrinklers (phase 2, type 0)
    if (w.phase === 2 && w.type === 0) {
      w.hp = 0; // Setting hp to 0 pops the wrinkler
      popped++;
    }
  }
  return popped;
}
