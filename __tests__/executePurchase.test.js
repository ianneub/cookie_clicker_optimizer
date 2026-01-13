/**
 * Tests for executePurchaseItem function
 */

const optimizer = require('../optimizer');
const { executePurchaseItem } = optimizer;
const { createBuildingMock, createUpgradeMock } = require('./mocks/game');

describe('executePurchaseItem', () => {
  let gameObjects;
  let gameUpgrades;

  beforeEach(() => {
    gameObjects = {
      'Cursor': createBuildingMock('Cursor', 50),
      'Grandma': createBuildingMock('Grandma', 40),
      'Farm': createBuildingMock('Farm', 30),
      'Wizard Tower': createBuildingMock('Wizard Tower', 8)
    };

    gameUpgrades = {
      'Lucky day': createUpgradeMock('Lucky day', 777777777),
      'Reinforced index finger': createUpgradeMock('Reinforced index finger', 100)
    };
  });

  describe('building purchases', () => {
    it('should buy single building', () => {
      const item = { name: 'Cursor', type: 'Building', price: 100, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Cursor'].buy).toHaveBeenCalledWith(1);
    });

    it('should buy multiple buildings (x10)', () => {
      const item = { name: 'Grandma x10', type: 'Building', price: 10000, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Grandma'].buy).toHaveBeenCalledWith(10);
    });

    it('should buy bulk buildings (x100)', () => {
      const item = { name: 'Farm x100', type: 'Building', price: 100000, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Farm'].buy).toHaveBeenCalledWith(100);
    });

    it('should handle building names with spaces', () => {
      const item = { name: 'Wizard Tower x10', type: 'Building', price: 100000, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Wizard Tower'].buy).toHaveBeenCalledWith(10);
    });

    it('should return false for non-existent building', () => {
      const item = { name: 'NonExistent', type: 'Building', price: 100, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });

    it('should return false for non-existent building with quantity', () => {
      const item = { name: 'NonExistent x10', type: 'Building', price: 100, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });

  describe('upgrade purchases', () => {
    it('should buy upgrade', () => {
      const item = { name: 'Lucky day', type: 'Upgrade', price: 777777777, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameUpgrades['Lucky day'].buy).toHaveBeenCalled();
    });

    it('should return false for non-existent upgrade', () => {
      const item = { name: 'NonExistent', type: 'Upgrade', price: 100, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null item', () => {
      expect(executePurchaseItem(null, gameObjects, gameUpgrades)).toBe(false);
    });

    it('should return false for undefined item', () => {
      expect(executePurchaseItem(undefined, gameObjects, gameUpgrades)).toBe(false);
    });

    it('should return false for unknown type', () => {
      const item = { name: 'Something', type: 'Unknown', price: 100, affordable: true };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });
});
