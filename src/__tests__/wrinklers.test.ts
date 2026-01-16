/**
 * Tests for wrinkler functions
 */

import { describe, it, expect } from 'vitest';
import {
  getWrinklerMultiplier,
  calculateNormalWrinklerReward,
  shouldPopForPurchase,
} from '../core/wrinklers';
import type { Wrinkler } from '../types';

describe('getWrinklerMultiplier', () => {
  it('should return base 1.1x with no upgrades', () => {
    expect(getWrinklerMultiplier(false, false)).toBe(1.1);
  });

  it('should return 1.155x with Wrinklerspawn', () => {
    expect(getWrinklerMultiplier(true, false)).toBeCloseTo(1.155, 4);
  });

  it('should return 1.155x with Sacrilegious Corruption', () => {
    expect(getWrinklerMultiplier(false, true)).toBeCloseTo(1.155, 4);
  });

  it('should return ~1.21x with both upgrades', () => {
    // 1.1 * 1.05 * 1.05 = 1.21275
    expect(getWrinklerMultiplier(true, true)).toBeCloseTo(1.21, 2);
  });
});

describe('calculateNormalWrinklerReward', () => {
  it('should return 0 for empty array', () => {
    expect(calculateNormalWrinklerReward([], 1.1)).toBe(0);
  });

  it('should calculate reward for active normal wrinklers', () => {
    const wrinklers: Wrinkler[] = [
      { phase: 2, type: 0, sucked: 1000, hp: 100 },
      { phase: 2, type: 0, sucked: 500, hp: 100 },
    ];
    expect(calculateNormalWrinklerReward(wrinklers, 1.1)).toBe(1650);
  });

  it('should ignore inactive wrinklers', () => {
    const wrinklers: Wrinkler[] = [
      { phase: 2, type: 0, sucked: 1000, hp: 100 },
      { phase: 0, type: 0, sucked: 500, hp: 100 }, // Inactive
    ];
    expect(calculateNormalWrinklerReward(wrinklers, 1.1)).toBe(1100);
  });

  it('should ignore shiny wrinklers', () => {
    const wrinklers: Wrinkler[] = [
      { phase: 2, type: 0, sucked: 1000, hp: 100 },
      { phase: 2, type: 1, sucked: 500, hp: 100 }, // Shiny
    ];
    expect(calculateNormalWrinklerReward(wrinklers, 1.1)).toBe(1100);
  });
});

describe('shouldPopForPurchase', () => {
  it('should not pop if already affordable', () => {
    const result = shouldPopForPurchase(1000, 500, 600, 100, 5);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Already affordable');
  });

  it('should not pop if reward is insufficient', () => {
    const result = shouldPopForPurchase(100, 1000, 500, 100, 5);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Pop reward insufficient');
  });

  it('should pop if it saves significant time', () => {
    // Need 500, CpS 1, time without pop = 500 seconds
    // Respawn time = 110 * 1 = 110 seconds
    // Saves 390 seconds
    const result = shouldPopForPurchase(600, 1000, 500, 1, 1);
    expect(result.shouldPop).toBe(true);
    expect(result.reason).toContain('Saves');
  });

  it('should not pop if respawn cost is too high', () => {
    // Need 100, CpS 100, time without pop = 1 second
    // Respawn time = 110 * 5 = 550 seconds
    const result = shouldPopForPurchase(200, 600, 500, 100, 5);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Respawn cost too high');
  });
});
