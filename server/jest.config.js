module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    '!node_modules/',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  verbose: true,
};
