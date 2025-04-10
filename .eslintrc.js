module.exports = {
    // Define environments (browser, Node.js, etc.)
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    // Set the parser for TypeScript
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
    },
    // Add plugins
    plugins: ['@typescript-eslint'],
    // Extend recommended ESLint and TypeScript rules
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
    ],
    // Customize rules here
    rules: {
      // For example, warn against unused variables
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn']
    },
    // Optionally, override settings for specific file types or packages
    overrides: [
      {
        files: ['*.ts', '*.tsx'],
        rules: {
          // Additional rules for TypeScript files can be specified here
        },
      },
    ],
  };
  