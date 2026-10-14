module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/test/**/*.js',
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/__tests__/**/*.spec.{ts,tsx}'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/accelerators/__tests__/setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react'
        }
      }
    ]
  }
};

