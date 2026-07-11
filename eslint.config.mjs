import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import nPlugin from 'eslint-plugin-n';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'openapi/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'prisma/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      n: nPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'n/no-process-env': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Root-level TS config files aren't part of tsconfig.json's `include`,
    // so they get plain (non-type-aware) TS parsing only.
    files: ['*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // ADR-0008: process.env is only read here, everywhere else must go
    // through the typed config object. Test harnesses are the one other
    // legitimate exception (e.g. DATABASE_URL to decide whether a DB-gated
    // suite runs) since they aren't application runtime code.
    files: ['src/config/**/*.ts', 'test/**/*.ts'],
    rules: {
      'n/no-process-env': 'off',
    },
  },
  prettierConfig,
];
