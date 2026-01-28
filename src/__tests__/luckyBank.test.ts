/**
 * Tests for Lucky bank functions
 */

import { describe, it, expect } from 'bun:test';
import { getLuckyBank, canAffordWithLuckyBank } from '../core/luckyBank';
import { LUCKY_BANK_PRICE_MULTIPLIER, PHASE_THRESHOLDS } from '../core/constants';

const MID_GAME_CPS = PHASE_THRESHOLDS.EARLY_TO_MID; // 1M CpS
const EARLY_GAME_CPS = 1000; // 1K CpS

describe('getLuckyBank', () => {
  it('should return price times multiplier in mid+ game', () => {
    expect(getLuckyBank(1000, MID_GAME_CPS)).toBe(1000 * LUCKY_BANK_PRICE_MULTIPLIER);
    expect(getLuckyBank(1_000_000, MID_GAME_CPS)).toBe(1_000_000 * LUCKY_BANK_PRICE_MULTIPLIER);
  });

  it('should return 0 in early game (< 1M CpS)', () => {
    expect(getLuckyBank(1000, EARLY_GAME_CPS)).toBe(0);
    expect(getLuckyBank(1_000_000, 0)).toBe(0);
  });

  it('should return 0 for undefined price', () => {
    expect(getLuckyBank(undefined, MID_GAME_CPS)).toBe(0);
  });

  it('should return 0 for zero price', () => {
    expect(getLuckyBank(0, MID_GAME_CPS)).toBe(0);
  });

  it('should return 0 for negative price', () => {
    expect(getLuckyBank(-100, MID_GAME_CPS)).toBe(0);
  });

  it('should floor the result', () => {
    expect(getLuckyBank(333, MID_GAME_CPS)).toBe(Math.floor(333 * LUCKY_BANK_PRICE_MULTIPLIER));
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
