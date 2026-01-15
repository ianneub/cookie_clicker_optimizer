/**
 * Tests for game phase detection and scaling functions
 */

const optimizer = require('../optimizer');
const {
  PHASE_THRESHOLDS,
  smoothstep,
  calculatePhaseProgress,
  getPhaseName,
  getMaxGoldenSaveHours,
  evaluateGoldenUpgradePriority
} = optimizer;

describe('PHASE_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(PHASE_THRESHOLDS.EARLY_TO_MID).toBe(1000000);       // 1M CpS
    expect(PHASE_THRESHOLDS.MID_TO_LATE).toBe(100000000);      // 100M CpS
    expect(PHASE_THRESHOLDS.LATE_TO_ENDGAME).toBe(1000000000); // 1B CpS
  });
});

describe('smoothstep', () => {
  it('should return 0 when x is at or below edge0', () => {
    expect(smoothstep(0.0, 0.25, 0.75)).toBe(0);
    expect(smoothstep(0.25, 0.25, 0.75)).toBe(0);
    expect(smoothstep(0.1, 0.25, 0.75)).toBe(0);
  });

  it('should return 1 when x is at or above edge1', () => {
    expect(smoothstep(0.75, 0.25, 0.75)).toBe(1);
    expect(smoothstep(1.0, 0.25, 0.75)).toBe(1);
    expect(smoothstep(0.9, 0.25, 0.75)).toBe(1);
  });

  it('should return 0.5 at the midpoint', () => {
    expect(smoothstep(0.5, 0.25, 0.75)).toBe(0.5);
  });

  it('should return values between 0 and 1 for intermediate inputs', () => {
    const result = smoothstep(0.4, 0.25, 0.75);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.5);
  });
});

describe('calculatePhaseProgress', () => {
  it('should return 0 for zero or negative CpS', () => {
    expect(calculatePhaseProgress(0)).toBe(0);
    expect(calculatePhaseProgress(-100)).toBe(0);
  });

  it('should return values in early phase range (0-0.33) for CpS < 1M', () => {
    expect(calculatePhaseProgress(100)).toBeGreaterThan(0);
    expect(calculatePhaseProgress(100)).toBeLessThan(0.33);

    expect(calculatePhaseProgress(100000)).toBeGreaterThan(0);
    expect(calculatePhaseProgress(100000)).toBeLessThan(0.33);
  });

  it('should return ~0.33 at early/mid threshold (1M CpS)', () => {
    const result = calculatePhaseProgress(1000000);
    expect(result).toBeCloseTo(0.33, 2);
  });

  it('should return values in mid phase range (0.33-0.66) for 1M-100M CpS', () => {
    expect(calculatePhaseProgress(5000000)).toBeGreaterThan(0.33);
    expect(calculatePhaseProgress(5000000)).toBeLessThan(0.66);

    expect(calculatePhaseProgress(50000000)).toBeGreaterThan(0.33);
    expect(calculatePhaseProgress(50000000)).toBeLessThan(0.66);
  });

  it('should return ~0.66 at mid/late threshold (100M CpS)', () => {
    const result = calculatePhaseProgress(100000000);
    expect(result).toBeCloseTo(0.66, 2);
  });

  it('should return values in late phase range (0.66-1.0) for CpS > 100M', () => {
    expect(calculatePhaseProgress(500000000)).toBeGreaterThan(0.66);
    expect(calculatePhaseProgress(500000000)).toBeLessThan(1.0);
  });

  it('should cap at 1.0 for endgame CpS (>= 1B)', () => {
    expect(calculatePhaseProgress(1000000000)).toBe(1);
    expect(calculatePhaseProgress(10000000000)).toBe(1);
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
    expect(getPhaseName(0.75)).toBe('Late');
    expect(getPhaseName(0.89)).toBe('Late');
  });

  it('should return "Endgame" for progress >= 0.9', () => {
    expect(getPhaseName(0.9)).toBe('Endgame');
    expect(getPhaseName(1.0)).toBe('Endgame');
  });
});

describe('getMaxGoldenSaveHours', () => {
  it('should return 0.5 hours for early game', () => {
    expect(getMaxGoldenSaveHours(0.1)).toBe(0.5);
    expect(getMaxGoldenSaveHours(0.2)).toBe(0.5);
    expect(getMaxGoldenSaveHours(0.32)).toBe(0.5);
  });

  it('should scale from 0.5 to 4 hours in mid game', () => {
    const earlyMid = getMaxGoldenSaveHours(0.34);
    expect(earlyMid).toBeGreaterThan(0.5);
    expect(earlyMid).toBeLessThan(4);

    const midMid = getMaxGoldenSaveHours(0.5);
    expect(midMid).toBeGreaterThan(0.5);
    expect(midMid).toBeLessThan(4);
  });

  it('should scale from 4 to 12 hours in late game', () => {
    const earlyLate = getMaxGoldenSaveHours(0.67);
    expect(earlyLate).toBeGreaterThanOrEqual(4);
    expect(earlyLate).toBeLessThan(12);

    const lateLate = getMaxGoldenSaveHours(0.9);
    expect(lateLate).toBeGreaterThan(4);
    expect(lateLate).toBeLessThanOrEqual(12);
  });
});

describe('evaluateGoldenUpgradePriority', () => {
  it('should not prioritize when CpS is 0', () => {
    const result = evaluateGoldenUpgradePriority(0.5, 1000000, 0);
    expect(result.shouldPrioritize).toBe(false);
    expect(result.reason).toBe('No CpS');
  });

  it('should not prioritize expensive upgrades in early game', () => {
    // 777M upgrade at 1000 CpS = 216 hours, way over 0.5 hour limit
    const result = evaluateGoldenUpgradePriority(0.2, 777777777, 1000);
    expect(result.shouldPrioritize).toBe(false);
    expect(result.hoursToAfford).toBeGreaterThan(100);
  });

  it('should prioritize affordable upgrades in late game', () => {
    // 777M upgrade at 10M CpS = 0.02 hours, well under limit
    const result = evaluateGoldenUpgradePriority(0.8, 777777777, 10000000);
    expect(result.shouldPrioritize).toBe(true);
    expect(result.hoursToAfford).toBeLessThan(1);
  });

  it('should prioritize cheap upgrades even in early game', () => {
    // 1000 cookies at 1000 CpS = 0.00028 hours, under 0.5 hour limit
    const result = evaluateGoldenUpgradePriority(0.2, 1000, 1000);
    expect(result.shouldPrioritize).toBe(true);
  });

  it('should include reason in result', () => {
    const result = evaluateGoldenUpgradePriority(0.5, 1000000, 1000);
    expect(result.reason).toMatch(/\d+\.?\d*h/); // Should contain hours
  });
});
