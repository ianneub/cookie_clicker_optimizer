/**
 * Tests for checkForPurchaseState function
 */

const optimizer = require('../optimizer');
const { checkForPurchaseState } = optimizer;

describe('checkForPurchaseState', () => {
  describe('when no purchase was made', () => {
    it('should return false when building and upgrade counts unchanged', () => {
      const state = { lastBuildingCount: 100, lastUpgradeCount: 50 };
      const result = checkForPurchaseState(state, 100, 50);

      expect(result.purchased).toBe(false);
      expect(result.newState.lastBuildingCount).toBe(100);
      expect(result.newState.lastUpgradeCount).toBe(50);
    });
  });

  describe('when a building was purchased', () => {
    it('should return true when building count increased', () => {
      const state = { lastBuildingCount: 100, lastUpgradeCount: 50 };
      const result = checkForPurchaseState(state, 101, 50);

      expect(result.purchased).toBe(true);
      expect(result.newState.lastBuildingCount).toBe(101);
    });

    it('should return true when multiple buildings purchased', () => {
      const state = { lastBuildingCount: 100, lastUpgradeCount: 50 };
      const result = checkForPurchaseState(state, 110, 50);

      expect(result.purchased).toBe(true);
      expect(result.newState.lastBuildingCount).toBe(110);
    });
  });

  describe('when an upgrade was purchased', () => {
    it('should return true when upgrade count increased', () => {
      const state = { lastBuildingCount: 100, lastUpgradeCount: 50 };
      const result = checkForPurchaseState(state, 100, 51);

      expect(result.purchased).toBe(true);
      expect(result.newState.lastUpgradeCount).toBe(51);
    });
  });

  describe('when both building and upgrade purchased', () => {
    it('should return true and update both counts', () => {
      const state = { lastBuildingCount: 100, lastUpgradeCount: 50 };
      const result = checkForPurchaseState(state, 105, 52);

      expect(result.purchased).toBe(true);
      expect(result.newState.lastBuildingCount).toBe(105);
      expect(result.newState.lastUpgradeCount).toBe(52);
    });
  });

  describe('initial state (first run)', () => {
    it('should detect change from zero', () => {
      const state = { lastBuildingCount: 0, lastUpgradeCount: 0 };
      const result = checkForPurchaseState(state, 10, 5);

      expect(result.purchased).toBe(true);
    });

    it('should not detect change if still zero', () => {
      const state = { lastBuildingCount: 0, lastUpgradeCount: 0 };
      const result = checkForPurchaseState(state, 0, 0);

      expect(result.purchased).toBe(false);
    });
  });

  describe('preserves other state properties', () => {
    it('should keep other state properties in newState', () => {
      const state = {
        lastBuildingCount: 100,
        lastUpgradeCount: 50,
        autoPurchase: true,
        autoGolden: false
      };
      const result = checkForPurchaseState(state, 101, 50);

      expect(result.newState.autoPurchase).toBe(true);
      expect(result.newState.autoGolden).toBe(false);
    });
  });
});
