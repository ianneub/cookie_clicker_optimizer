const {
  WRINKLER_RESPAWN_TIME,
  getWrinklerMultiplier,
  calculateNormalWrinklerReward,
  shouldPopForPurchase
} = require('../optimizer.js');

describe('WRINKLER_RESPAWN_TIME', () => {
  test('should be approximately 110 seconds', () => {
    expect(WRINKLER_RESPAWN_TIME).toBe(110);
  });
});

describe('getWrinklerMultiplier', () => {
  test('should return 1.1 with no upgrades', () => {
    const result = getWrinklerMultiplier(false, false);
    expect(result).toBeCloseTo(1.1, 5);
  });

  test('should return 1.155 with Wrinklerspawn only', () => {
    const result = getWrinklerMultiplier(true, false);
    expect(result).toBeCloseTo(1.155, 5);
  });

  test('should return 1.155 with Sacrilegious Corruption only', () => {
    const result = getWrinklerMultiplier(false, true);
    expect(result).toBeCloseTo(1.155, 5);
  });

  test('should return 1.21275 with both upgrades', () => {
    const result = getWrinklerMultiplier(true, true);
    expect(result).toBeCloseTo(1.21275, 5);
  });
});

describe('calculateNormalWrinklerReward', () => {
  test('should calculate reward for single normal wrinkler', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 1000 }
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.1);
    expect(result).toBe(1100);
  });

  test('should sum rewards for multiple normal wrinklers', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 1000 },
      { phase: 2, type: 0, sucked: 2000 },
      { phase: 2, type: 0, sucked: 3000 }
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.1);
    expect(result).toBe(6600); // (1000 + 2000 + 3000) * 1.1
  });

  test('should exclude shiny wrinklers (type 1)', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 1000 },
      { phase: 2, type: 1, sucked: 5000 } // shiny - should be excluded
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.1);
    expect(result).toBe(1100); // only the normal wrinkler
  });

  test('should exclude inactive wrinklers (phase != 2)', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 1000 },
      { phase: 0, type: 0, sucked: 5000 }, // empty slot
      { phase: 1, type: 0, sucked: 3000 }  // spawning
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.1);
    expect(result).toBe(1100);
  });

  test('should handle empty wrinkler array', () => {
    const result = calculateNormalWrinklerReward([], 1.1);
    expect(result).toBe(0);
  });

  test('should handle wrinklers with zero sucked', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 0 },
      { phase: 2, type: 0, sucked: 1000 }
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.1);
    expect(result).toBe(1100);
  });

  test('should apply upgrade multiplier correctly', () => {
    const wrinklers = [
      { phase: 2, type: 0, sucked: 1000 }
    ];
    const result = calculateNormalWrinklerReward(wrinklers, 1.21275);
    expect(result).toBeCloseTo(1212.75, 2);
  });
});

describe('shouldPopForPurchase', () => {
  test('should not pop when item is already affordable', () => {
    const result = shouldPopForPurchase(1000, 500, 600, 100, 5);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Already affordable');
  });

  test('should not pop when reward is insufficient', () => {
    const result = shouldPopForPurchase(100, 1000, 500, 100, 5);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Pop reward insufficient');
  });

  test('should pop when it saves significant time', () => {
    // Need 5000 more cookies, have 0, CpS is 10
    // Without pop: 5000/10 = 500 seconds
    // With 5 wrinklers: respawn time = 5 * 110 = 550 seconds
    // But pop reward is 6000, so we can afford immediately
    // Since 500 < 550, respawn cost is too high in this case

    // Let's make time savings more significant:
    // Need 10000 more, CpS = 1, so 10000 seconds without pop
    // Respawn time = 5 * 110 = 550 seconds
    // 10000 > 550, so should pop
    const result = shouldPopForPurchase(10000, 10000, 0, 1, 5);
    expect(result.shouldPop).toBe(true);
    expect(result.reason).toContain('Saves');
  });

  test('should not pop when respawn cost is too high', () => {
    // Need 500 more cookies, CpS = 100
    // Without pop: 500/100 = 5 seconds
    // With 1 wrinkler: respawn time = 110 seconds
    // 5 < 110, so respawn cost is too high
    const result = shouldPopForPurchase(1000, 1000, 500, 100, 1);
    expect(result.shouldPop).toBe(false);
    expect(result.reason).toBe('Respawn cost too high');
  });

  test('should consider wrinkler count for respawn time', () => {
    // More wrinklers = longer total respawn time
    // Need 2000, CpS = 10, without pop = 200 seconds
    // 1 wrinkler: respawn = 110s, 200 > 110, should pop
    const result1 = shouldPopForPurchase(2000, 2000, 0, 10, 1);
    expect(result1.shouldPop).toBe(true);

    // 10 wrinklers: respawn = 1100s, 200 < 1100, should NOT pop
    const result10 = shouldPopForPurchase(2000, 2000, 0, 10, 10);
    expect(result10.shouldPop).toBe(false);
  });
});
