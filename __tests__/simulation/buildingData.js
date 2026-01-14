/**
 * Real Cookie Clicker building data
 * Base prices and CPS values from the game
 */

const BUILDINGS = {
  'Cursor':               { basePrice: 15,            baseCps: 0.1 },
  'Grandma':              { basePrice: 100,           baseCps: 1 },
  'Farm':                 { basePrice: 1100,          baseCps: 8 },
  'Mine':                 { basePrice: 12000,         baseCps: 47 },
  'Factory':              { basePrice: 130000,        baseCps: 260 },
  'Bank':                 { basePrice: 1400000,       baseCps: 1400 },
  'Temple':               { basePrice: 20000000,      baseCps: 7800 },
  'Wizard Tower':         { basePrice: 330000000,     baseCps: 44000 },
  'Shipment':             { basePrice: 5100000000,    baseCps: 260000 },
  'Alchemy Lab':          { basePrice: 75000000000,   baseCps: 1600000 },
  'Portal':               { basePrice: 1e12,          baseCps: 10000000 },
  'Time Machine':         { basePrice: 14e12,         baseCps: 65000000 },
  'Antimatter Condenser': { basePrice: 170e12,        baseCps: 430000000 },
  'Prism':                { basePrice: 2.1e15,        baseCps: 2900000000 },
  'Chancemaker':          { basePrice: 26e15,         baseCps: 21000000000 },
  'Fractal Engine':       { basePrice: 310e15,        baseCps: 150000000000 },
  'Javascript Console':   { basePrice: 71e18,         baseCps: 1100000000000 },
  'Idleverse':            { basePrice: 12e21,         baseCps: 8300000000000 },
  'Cortex Baker':         { basePrice: 1.9e24,        baseCps: 64000000000000 },
  'You':                  { basePrice: 540e24,        baseCps: 510000000000000 }
};

// Building names in order (useful for iteration)
const BUILDING_ORDER = [
  'Cursor', 'Grandma', 'Farm', 'Mine', 'Factory', 'Bank', 'Temple',
  'Wizard Tower', 'Shipment', 'Alchemy Lab', 'Portal', 'Time Machine',
  'Antimatter Condenser', 'Prism', 'Chancemaker', 'Fractal Engine',
  'Javascript Console', 'Idleverse', 'Cortex Baker', 'You'
];

module.exports = {
  BUILDINGS,
  BUILDING_ORDER
};
