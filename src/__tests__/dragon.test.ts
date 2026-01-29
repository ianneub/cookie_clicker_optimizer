/**
 * Tests for dragon aura functions
 */

import { describe, it, expect } from 'bun:test';
import {
  getRecommendedAuras,
  shouldSwitchAuras,
  countKittenUpgrades,
  getAuraName,
  getAuraIndex,
  AURA_SWITCH_COOLDOWN,
  MIN_BUILDING_COUNT_FOR_SWITCH,
} from '../core/dragon';

describe('getRecommendedAuras', () => {
  it('should recommend Elder Battalion + Radiant Appetite for early game', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.2,
      kittenCount: 2,
      totalBuildings: 500,
      hasActiveFrenzy: false,
    });
    expect(config.aura1).toBe('Elder Battalion');
    expect(config.aura2).toBe('Radiant Appetite');
  });

  it('should recommend Elder Battalion + Radiant Appetite for mid game', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.5,
      kittenCount: 5,
      totalBuildings: 2000,
      hasActiveFrenzy: false,
    });
    expect(config.aura1).toBe('Elder Battalion');
    expect(config.aura2).toBe('Radiant Appetite');
  });

  it('should recommend Breath of Milk + Radiant Appetite for late game with many kittens', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.8,
      kittenCount: 12,
      totalBuildings: 5000,
      hasActiveFrenzy: false,
    });
    expect(config.aura1).toBe('Breath of Milk');
    expect(config.aura2).toBe('Radiant Appetite');
  });

  it('should recommend Elder Battalion + Radiant Appetite for late game with few kittens', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.8,
      kittenCount: 5,
      totalBuildings: 5000,
      hasActiveFrenzy: false,
    });
    expect(config.aura1).toBe('Elder Battalion');
    expect(config.aura2).toBe('Radiant Appetite');
  });

  it('should recommend Elder Battalion + Breath of Milk for endgame (15k+ buildings)', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.95,
      kittenCount: 15,
      totalBuildings: 16000,
      hasActiveFrenzy: false,
    });
    expect(config.aura1).toBe('Elder Battalion');
    expect(config.aura2).toBe('Breath of Milk');
  });

  it("should recommend Dragon's Fortune + Epoch Manipulator during Frenzy", () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.5,
      kittenCount: 5,
      totalBuildings: 2000,
      hasActiveFrenzy: true,
    });
    expect(config.aura1).toBe("Dragon's Fortune");
    expect(config.aura2).toBe('Epoch Manipulator');
  });

  it('should prioritize Frenzy auras even in endgame', () => {
    const config = getRecommendedAuras({
      phaseProgress: 0.95,
      kittenCount: 15,
      totalBuildings: 20000,
      hasActiveFrenzy: true,
    });
    expect(config.aura1).toBe("Dragon's Fortune");
    expect(config.aura2).toBe('Epoch Manipulator');
  });
});

describe('shouldSwitchAuras', () => {
  const current = { aura1: 'Elder Battalion' as const, aura2: 'Radiant Appetite' as const };
  const recommended = { aura1: 'Breath of Milk' as const, aura2: 'Radiant Appetite' as const };
  const frenzyAuras = { aura1: "Dragon's Fortune" as const, aura2: 'Epoch Manipulator' as const };
  const hasAllAuras = () => true;

  it('should not switch if already optimal', () => {
    const result = shouldSwitchAuras(current, current, 0, false, 10, hasAllAuras);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toBe('Already optimal');
  });

  it('should not switch if building count is too low', () => {
    const result = shouldSwitchAuras(current, recommended, 0, false, 1, hasAllAuras);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toContain('top buildings');
  });

  it('should switch for phase transition after cooldown', () => {
    const oldTime = Date.now() - AURA_SWITCH_COOLDOWN - 1000;
    const result = shouldSwitchAuras(current, recommended, oldTime, false, 10, hasAllAuras);
    expect(result.shouldSwitch).toBe(true);
    expect(result.reason).toBe('Phase transition');
  });

  it('should not switch during cooldown', () => {
    const recentTime = Date.now() - 30000; // 30 seconds ago
    const result = shouldSwitchAuras(current, recommended, recentTime, false, 10, hasAllAuras);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toContain('Cooldown');
  });

  it('should bypass cooldown for Frenzy', () => {
    const recentTime = Date.now() - 5000; // 5 seconds ago
    const result = shouldSwitchAuras(current, frenzyAuras, recentTime, true, 10, hasAllAuras);
    expect(result.shouldSwitch).toBe(true);
    expect(result.reason).toBe('Frenzy active');
  });

  it('should still check building count during Frenzy', () => {
    const result = shouldSwitchAuras(current, frenzyAuras, 0, true, 1, hasAllAuras);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toContain('top buildings');
  });

  it('should not switch if primary aura not unlocked', () => {
    const hasAura = (name: string) => name !== 'Breath of Milk';
    const result = shouldSwitchAuras(current, recommended, 0, false, 10, hasAura);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toContain('Breath of Milk not unlocked');
  });

  it('should not switch if secondary aura not unlocked', () => {
    const hasAura = (name: string) => name !== 'Radiant Appetite';
    const result = shouldSwitchAuras(current, recommended, 0, false, 10, hasAura);
    expect(result.shouldSwitch).toBe(false);
    expect(result.reason).toContain('Radiant Appetite not unlocked');
  });
});

describe('countKittenUpgrades', () => {
  it('should return 0 when no kittens owned', () => {
    const has = () => false;
    expect(countKittenUpgrades(has)).toBe(0);
  });

  it('should count owned kitten upgrades', () => {
    const owned = new Set(['Kitten helpers', 'Kitten workers', 'Kitten engineers']);
    const has = (name: string) => owned.has(name);
    expect(countKittenUpgrades(has)).toBe(3);
  });

  it('should include dragon-related upgrades', () => {
    const owned = new Set(['Dragon scale', 'Dragon claw', 'Dragon fang']);
    const has = (name: string) => owned.has(name);
    expect(countKittenUpgrades(has)).toBe(3);
  });
});

describe('getAuraName', () => {
  it('should return correct name for valid index', () => {
    expect(getAuraName(0)).toBe('No aura');
    expect(getAuraName(15)).toBe('Radiant Appetite');
    expect(getAuraName(16)).toBe("Dragon's Fortune");
    expect(getAuraName(21)).toBe('Dragon Guts');
  });

  it('should return No aura for invalid index', () => {
    expect(getAuraName(-1)).toBe('No aura');
    expect(getAuraName(999)).toBe('No aura');
  });
});

describe('getAuraIndex', () => {
  it('should return correct index for valid name', () => {
    expect(getAuraIndex('No aura')).toBe(0);
    expect(getAuraIndex('Radiant Appetite')).toBe(15);
    expect(getAuraIndex("Dragon's Fortune")).toBe(16);
    expect(getAuraIndex('Dragon Guts')).toBe(21);
  });
});
