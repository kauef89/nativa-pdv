import globals from 'globals';
import pluginJs from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        nativaDeliveryData: 'readonly',
        nativaEntregasData: 'readonly',
        google: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
  prettierConfig,
  {
    ignores: [
      'node_modules/',
      'vendor/',
      'build/',
      'dist/',
      '*.lock',
      'manifest.json',
      'vite.config.js',
    ],
  },
];
