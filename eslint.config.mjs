import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The plugin has shipped both config names over time; accept either so an upgrade does
// not silently drop the React hook rules.
const reactHookRules = (reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended)?.rules ?? {};

export default tseslint.config(
  {
    // Generated output, local tools and the private folder are never reviewed by hand.
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'tools/**',
      'private/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHookRules },
  },
  {
    // Node-only files use process and console, which browser code must not assume.
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // Repository scripts report progress on stdout by design.
    files: ['scripts/**/*.mjs', 'eslint.config.mjs'],
    rules: { 'no-console': 'off' },
  },
);
