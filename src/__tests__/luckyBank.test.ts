/**
 * Tests for Lucky bank functions
 */

import { describe, it, expect } from 'bun:test';
import { getLuckyBank, canAffordWithLuckyBank } from '../core/luckyBank';
import { LUCKY_BANK_PRICE_MULTIPLIER } from '../core/constants';

describe('getLuckyBank', () => {
  it('should return price times multiplier', () => {
    expect(getLuckyBank(1000)).toBe(1000 * LUCKY_BANK_PRICE_MULTIPLIER);
    expect(getLuckyBank(1_000_000)).toBe(1_000_000 * LUCKY_BANK_PRICE_MULTIPLIER);
  });

  it('should return 0 for undefined price', () => {
    expect(getLuckyBank(undefined)).toBe(0);
  });

  it('should return 0 for zero price', () => {
    expect(getLuckyBank(0)).toBe(0);
  });

  it('should return 0 for negative price', () => {
    expect(getLuckyBank(-100)).toBe(0);
  });

  it('should floor the result', () => {
    // 333.33... * 3 = 1000, but ensure we floor
    expect(getLuckyBank(333)).toBe(Math.floor(333 * LUCKY_BANK_PRICE_MULTIPLIER));
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
