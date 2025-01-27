/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2020',
        lib: ['es2020', 'dom'],
        module: 'commonjs',
        esModuleInterop: true,
        allowJs: true,
        strict: false
      }
    }]
  },
  setupFiles: [
    "fake-indexeddb/auto",
    "<rootDir>/src/api/test/setup.ts"
  ],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  testTimeout: 30000,
  moduleNameMapper: {
    '^aubiojs$': '<rootDir>/src/types/aubiojs.d.ts'
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
