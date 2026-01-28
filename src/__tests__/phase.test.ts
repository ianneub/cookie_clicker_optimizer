/**
 * Tests for phase detection functions
 */

import { describe, it, expect } from 'bun:test';
import {
  smoothstep,
  calculatePhaseProgress,
  getPhaseName,
  getMaxGoldenSaveHours,
  evaluateGoldenUpgradePriority,
} from '../core/phase';

describe('smoothstep', () => {
  it('should return 0 when x <= edge0', () => {
    expect(smoothstep(0, 0, 1)).toBe(0);
    expect(smoothstep(-1, 0, 1)).toBe(0);
  });

  it('should return 1 when x >= edge1', () => {
    expect(smoothstep(1, 0, 1)).toBe(1);
    expect(smoothstep(2, 0, 1)).toBe(1);
  });

  it('should return 0.5 at midpoint', () => {
    expect(smoothstep(0.5, 0, 1)).toBe(0.5);
  });
});

describe('calculatePhaseProgress', () => {
  it('should return 0 for 0 CpS', () => {
    expect(calculatePhaseProgress(0)).toBe(0);
  });

  it('should return 0 for negative CpS', () => {
    expect(calculatePhaseProgress(-100)).toBe(0);
  });

  it('should return ~0.33 at 1M CpS (early/mid boundary)', () => {
    const progress = calculatePhaseProgress(1_000_000);
    expect(progress).toBeCloseTo(0.33, 2);
  });

  it('should return ~0.66 at 100M CpS (mid/late boundary)', () => {
    const progress = calculatePhaseProgress(100_000_000);
    expect(progress).toBeCloseTo(0.66, 2);
  });

  it('should return 1.0 at 1B CpS (endgame)', () => {
    const progress = calculatePhaseProgress(1_000_000_000);
    expect(progress).toBe(1.0);
  });
});

describe('getPhaseName', () => {
  it('should return "Early" for progress < 0.33', () => {
    expect(getPhaseName(0)).toBe('Early');
    expect(getPhaseName(0.1)).toBe('Early');
    expect(getPhaseName(0.32)).toBe('Early');
  });

  it('should return "Mid" for progress 0.33-0.66', () => {
    expect(getPhaseName(0.33)).toBe('Mid');
    expect(getPhaseName(0.5)).toBe('Mid');
    expect(getPhaseName(0.65)).toBe('Mid');
  });

  it('should return "Late" for progress 0.66-0.9', () => {
    expect(getPhaseName(0.66)).toBe('Late');
    expect(getPhaseName(0.8)).toBe('Late');
    expect(getPhaseName(0.89)).toBe('Late');
  });

  it('should return "Endgame" for progress >= 0.9', () => {
    expect(getPhaseName(0.9)).toBe('Endgame');
    expect(getPhaseName(1.0)).toBe('Endgame');
  });
});

describe('getMaxGoldenSaveHours', () => {
  it('should return 0.5 hours for early game', () => {
    expect(getMaxGoldenSaveHours(0)).toBe(0.5);
    expect(getMaxGoldenSaveHours(0.32)).toBe(0.5);
  });

  it('should return 4 hours at start of late game', () => {
    expect(getMaxGoldenSaveHours(0.66)).toBe(4);
  });

  it('should return 12 hours at endgame', () => {
    expect(getMaxGoldenSaveHours(1.0)).toBe(12);
  });
});

describe('evaluateGoldenUpgradePriority', () => {
  it('should not prioritize when CpS is 0', () => {
    const result = evaluateGoldenUpgradePriority(0.5, 1000, 0);
    expect(result.shouldPrioritize).toBe(false);
    expect(result.reason).toBe('No CpS');
    expect(result.hoursToAfford).toBe(Infinity);
  });

  it('should prioritize affordable upgrades', () => {
    // At phase 0.5, max hours is about 2.25
    // Price 1000, CpS 1000 = 1000/(1000*3600) = 0.000278 hours
    const result = evaluateGoldenUpgradePriority(0.5, 1000, 1000);
    expect(result.shouldPrioritize).toBe(true);
  });

  it('should not prioritize very expensive upgrades', () => {
    // Price 1e12 at 1000 CpS = 277,777 hours
    const result = evaluateGoldenUpgradePriority(0.5, 1e12, 1000);
    expect(result.shouldPrioritize).toBe(false);
  });
});
