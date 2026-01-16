/**
 * Game phase detection and scaling functions
 */

import { PHASE_THRESHOLDS } from './constants';
import type { Phase, GoldenUpgradeEvaluation } from '../types';

/**
 * Smoothstep interpolation function for smooth transitions
 * Returns 0 when x <= edge0, 1 when x >= edge1, smooth curve between
 */
export function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Calculate game phase progress from 0.0 (very early) to 1.0 (endgame)
 * Uses logarithmic scale for smooth progression through exponential CpS growth
 */
export function calculatePhaseProgress(cps: number): number {
  if (cps <= 0) return 0;

  const EARLY_THRESHOLD = PHASE_THRESHOLDS.EARLY_TO_MID;
  const LATE_THRESHOLD = PHASE_THRESHOLDS.MID_TO_LATE;
  const ENDGAME_THRESHOLD = PHASE_THRESHOLDS.LATE_TO_ENDGAME;

  if (cps <= EARLY_THRESHOLD) {
    // Early game: 0.0 to 0.33
    return (Math.log10(cps) / Math.log10(EARLY_THRESHOLD)) * 0.33;
  } else if (cps <= LATE_THRESHOLD) {
    // Mid game: 0.33 to 0.66
    const midProgress =
      (Math.log10(cps) - Math.log10(EARLY_THRESHOLD)) /
      (Math.log10(LATE_THRESHOLD) - Math.log10(EARLY_THRESHOLD));
    return 0.33 + midProgress * 0.33;
  } else {
    // Late/Endgame: 0.66 to 1.0 (caps at endgame threshold)
    const lateProgress = Math.min(
      1,
      (Math.log10(cps) - Math.log10(LATE_THRESHOLD)) /
        (Math.log10(ENDGAME_THRESHOLD) - Math.log10(LATE_THRESHOLD))
    );
    return 0.66 + lateProgress * 0.34;
  }
}

/**
 * Get human-readable phase name
 */
export function getPhaseName(phaseProgress: number): Phase {
  if (phaseProgress < 0.33) return 'Early';
  if (phaseProgress < 0.66) return 'Mid';
  if (phaseProgress < 0.9) return 'Late';
  return 'Endgame';
}

/**
 * Calculate scaled Lucky bank based on game phase
 * Early game has no protection, scales up through mid game, full protection in late game
 */
export function getScaledLuckyBank(baseLuckyBank: number, phaseProgress: number): number {
  // Scale starts at 0% for progress < 0.25, reaches 100% at progress >= 0.75
  const scale = smoothstep(phaseProgress, 0.25, 0.75);
  return Math.floor(baseLuckyBank * scale);
}

/**
 * Get maximum hours willing to save for golden upgrades based on phase
 */
export function getMaxGoldenSaveHours(phaseProgress: number): number {
  if (phaseProgress < 0.33) {
    return 0.5; // Early game: 30 minutes max
  } else if (phaseProgress < 0.66) {
    // Mid game: scale from 0.5 to 4 hours
    const t = (phaseProgress - 0.33) / 0.33;
    return 0.5 + t * 3.5;
  } else {
    // Late game: scale from 4 to 12 hours
    const t = (phaseProgress - 0.66) / 0.34;
    return 4 + t * 8;
  }
}

/**
 * Evaluate if a golden upgrade should be prioritized based on game phase
 */
export function evaluateGoldenUpgradePriority(
  phaseProgress: number,
  price: number,
  currentCpS: number
): GoldenUpgradeEvaluation {
  if (currentCpS <= 0) {
    return {
      shouldPrioritize: false,
      reason: 'No CpS',
      hoursToAfford: Infinity,
    };
  }

  const hoursToAfford = price / (currentCpS * 3600);
  const maxHours = getMaxGoldenSaveHours(phaseProgress);

  if (hoursToAfford > maxHours) {
    return {
      shouldPrioritize: false,
      reason: `${hoursToAfford.toFixed(1)}h > ${maxHours.toFixed(1)}h limit`,
      hoursToAfford,
    };
  }

  return {
    shouldPrioritize: true,
    reason: `${hoursToAfford.toFixed(1)}h affordable`,
    hoursToAfford,
  };
}
