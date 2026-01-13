module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['optimizer.js'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
};
