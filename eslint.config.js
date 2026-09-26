// ESLint 10 flat config. Run: npm run lint:js
// Size and complexity limits mirror tools/architecture.json, so editors flag problems as you type.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  {
    files: ['public/src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    // No escape hatches: `eslint-disable` comments in game code are ignored (and reported).
    linterOptions: { noInlineConfig: true },
    rules: {
      // Keep files and functions small enough to understand at a glance.
      'max-lines': ['error', { max: 200, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      // Keep logic readable: limit branching, nesting and parameter lists.
      complexity: ['error', { max: 25 }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      'max-nested-callbacks': ['error', 3],
      // Correctness.
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
      'no-shadow': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'warn',
    },
  },
  {
    // Injected into the game page by tools/demo/record.mjs.
    files: ['tools/demo/overlay.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    files: ['server.js', 'tools/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
  {
    // The demo tour passes callbacks to page.evaluate, which run inside the game page.
    files: ['tools/demo/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
