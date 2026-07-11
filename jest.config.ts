import type { Config } from 'jest';

const moduleNameMapper = {
  '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
};

const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper,
  rootDir: '.',
};

const config: Config = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
    },
    {
      ...base,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
    },
  ],
};

export default config;
