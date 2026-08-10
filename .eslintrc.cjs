/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'out/',
    '.vite/',
    'coverage/',
    'artifacts/',
    'cache/',
    'playwright-report/',
    'test-results/',
    'blob-report/',
    'playwright/.auth/',
    'test/e2e/.auth/',
  ],
  rules: {
    // TypeScript's strict project configuration owns these checks and avoids
    // core-rule false positives for type-only imports and declarations.
    'no-undef': 'off',
    'no-unused-vars': 'off',
  },
};
