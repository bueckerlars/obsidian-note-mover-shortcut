import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig([
  {
    ignores: [
      'main.js',
      'node_modules/**',
      'dist/**',
      'scripts/**',
      '**/*.mjs',
      '**/*.js',
      '**/*.json',
      'src/**/*.test.ts',
      'src/test-utils/**',
      'src/generated/**',
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'obsidianmd/ui/sentence-case': [
        'error',
        { brands: ['Advanced Note Mover'] },
      ],
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'none',
          caughtErrors: 'none',
        },
      ],
    },
  },
  {
    files: ['src/modals/UpdateModal.ts'],
    rules: {
      // Changelog section headings use intentional title-style casing.
      'obsidianmd/ui/sentence-case': 'off',
    },
  },
]);
