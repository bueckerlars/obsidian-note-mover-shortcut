module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 78,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/src/__mocks__/obsidian.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/types/__tests__/HistoryEntryType.test.ts',
  ],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};
