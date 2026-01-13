/**
 * Factory for creating CookieMonsterData mocks
 */

function createCookieMonsterDataMock(options = {}) {
  const {
    objects1 = {},
    objects10 = {},
    objects100 = {},
    upgrades = {}
  } = options;

  // Default PP values for buildings (lower = better)
  const defaultObjects1 = {
    'Cursor': { pp: 1500.5 },
    'Grandma': { pp: 800.3 },
    'Farm': { pp: 450.2 },
    'Mine': { pp: 320.1 },
    'Factory': { pp: 250.8 },
    'Bank': { pp: 180.4 },
    'Temple': { pp: 150.2 },
    'Wizard Tower': { pp: 120.9 },
    ...objects1
  };

  const defaultObjects10 = {
    'Cursor': { pp: 1400.2 },
    'Grandma': { pp: 750.1 },
    'Farm': { pp: 420.5 },
    'Mine': { pp: 300.3 },
    'Factory': { pp: 230.6 },
    'Bank': { pp: 165.2 },
    'Temple': { pp: 140.1 },
    'Wizard Tower': { pp: 110.5 },
    ...objects10
  };

  const defaultObjects100 = {
    'Cursor': { pp: 1300.8 },
    'Grandma': { pp: 700.4 },
    'Farm': { pp: 400.2 },
    'Mine': { pp: 280.7 },
    'Factory': { pp: 210.3 },
    'Bank': { pp: 150.9 },
    'Temple': { pp: 130.5 },
    'Wizard Tower': { pp: 100.2 },
    ...objects100
  };

  const defaultUpgrades = {
    'Reinforced index finger': { pp: 50.5 },
    'Carpal tunnel prevention cream': { pp: 75.3 },
    'Ambidextrous': { pp: 100.2 },
    // Golden upgrades typically have undefined/NaN PP
    'Lucky day': { pp: undefined },
    'Serendipity': { pp: undefined },
    'Get lucky': { pp: NaN },
    ...upgrades
  };

  return {
    Objects1: defaultObjects1,
    Objects10: defaultObjects10,
    Objects100: defaultObjects100,
    Upgrades: defaultUpgrades,
    Cache: {}
  };
}

module.exports = {
  createCookieMonsterDataMock
};
