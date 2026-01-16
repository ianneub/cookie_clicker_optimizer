/**
 * Tests for Lucky bank functions
 */

import { describe, it, expect } from 'vitest';
import { getBaseLuckyBank, getLuckyBank, canAffordWithLuckyBank } from '../core/luckyBank';

describe('getBaseLuckyBank', () => {
  it('should use CM cache value when available', () => {
    const cmCache = { Lucky: 1000000 };
    expect(getBaseLuckyBank(cmCache, 100)).toBe(1000000);
  });

  it('should fall back to 6000x CpS when cache unavailable', () => {
    expect(getBaseLuckyBank(null, 1000)).toBe(6000000);
    expect(getBaseLuckyBank(undefined, 1000)).toBe(6000000);
  });

  it('should fall back when cache Lucky is 0', () => {
    const cmCache = { Lucky: 0 };
    expect(getBaseLuckyBank(cmCache, 1000)).toBe(6000000);
  });

  it('should fall back when cache Lucky is negative', () => {
    const cmCache = { Lucky: -100 };
    expect(getBaseLuckyBank(cmCache, 1000)).toBe(6000000);
  });
});

describe('getLuckyBank', () => {
  it('should return scaled value based on phase', () => {
    const result = getLuckyBank(null, 1_000_000); // 1M CpS = ~0.33 progress
    expect(result.base).toBe(6000 * 1_000_000);
    expect(result.phaseProgress).toBeCloseTo(0.33, 2);
    expect(result.phaseName).toBe('Mid');
  });

  it('should return 0 scaled for early game', () => {
    const result = getLuckyBank(null, 1000); // Very early
    expect(result.scaled).toBe(0);
    expect(result.phaseName).toBe('Early');
  });
});

describe('canAffordWithLuckyBank', () => {
  it('should return true when purchase leaves cookies above bank', () => {
    expect(canAffordWithLuckyBank(1000, 500, 400)).toBe(true);
  });

  it('should return true when purchase leaves cookies exactly at bank', () => {
    expect(canAffordWithLuckyBank(1000, 500, 500)).toBe(true);
  });

  it('should return false when purchase would drop below bank', () => {
    expect(canAffordWithLuckyBank(1000, 600, 500)).toBe(false);
  });

  it('should work with 0 bank threshold', () => {
    expect(canAffordWithLuckyBank(100, 100, 0)).toBe(true);
    expect(canAffordWithLuckyBank(100, 150, 0)).toBe(false);
  });
});
