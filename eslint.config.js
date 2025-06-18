import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
