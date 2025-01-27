/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: [
    "fake-indexeddb/auto",
    "<rootDir>/src/api/test/setup.ts"
  ],
  testMatch: ["<rootDir>/src/**/?(*.)test.ts"],
  testTimeout: 10000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/test/'
  ],
  moduleNameMapper: {
    '^aubiojs$': '<rootDir>/src/types/aubiojs.d.ts'
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        lib: ['es2020', 'dom'],
        esModuleInterop: true
      }
    }
  }
};

export default config;
