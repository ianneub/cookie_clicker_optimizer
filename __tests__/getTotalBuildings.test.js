/**
 * Tests for getTotalBuildings function
 */

const optimizer = require('../optimizer');
const { getTotalBuildings } = optimizer;
const { createBuildingMock } = require('./mocks/game');

describe('getTotalBuildings', () => {
  it('should sum all building amounts', () => {
    const gameObjects = {
      'Cursor': createBuildingMock('Cursor', 50),
      'Grandma': createBuildingMock('Grandma', 40),
      'Farm': createBuildingMock('Farm', 30)
    };

    expect(getTotalBuildings(gameObjects)).toBe(120);
  });

  it('should return 0 for empty objects', () => {
    expect(getTotalBuildings({})).toBe(0);
  });

  it('should handle buildings with 0 amount', () => {
    const gameObjects = {
      'Cursor': createBuildingMock('Cursor', 0),
      'Grandma': createBuildingMock('Grandma', 0)
    };

    expect(getTotalBuildings(gameObjects)).toBe(0);
  });

  it('should handle single building', () => {
    const gameObjects = {
      'Cursor': createBuildingMock('Cursor', 100)
    };

    expect(getTotalBuildings(gameObjects)).toBe(100);
  });

  it('should handle large numbers', () => {
    const gameObjects = {
      'Cursor': createBuildingMock('Cursor', 1000000),
      'Grandma': createBuildingMock('Grandma', 2000000)
    };

    expect(getTotalBuildings(gameObjects)).toBe(3000000);
  });

  it('should handle many buildings', () => {
    const gameObjects = {
      'Cursor': createBuildingMock('Cursor', 50),
      'Grandma': createBuildingMock('Grandma', 40),
      'Farm': createBuildingMock('Farm', 30),
      'Mine': createBuildingMock('Mine', 25),
      'Factory': createBuildingMock('Factory', 20),
      'Bank': createBuildingMock('Bank', 15),
      'Temple': createBuildingMock('Temple', 10),
      'Wizard Tower': createBuildingMock('Wizard Tower', 8)
    };

    expect(getTotalBuildings(gameObjects)).toBe(198);
  });
});
