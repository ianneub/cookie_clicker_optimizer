/**
 * Jest setup file
 * Runs before each test file
 */

// Reset globals before each test
beforeEach(() => {
  // Clear any existing CCOptimizer state
  if (global.window) {
    delete global.window.CCOptimizer;
    delete global.window.CCOptimizerStop;
  }

  // Clear Game and CookieMonsterData
  delete global.Game;
  delete global.CookieMonsterData;
});

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
