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
      // The review scanner runs the upstream rule. The obsidianmd copy ignores
      // thenable Setting and ButtonComponent, so it would miss what the scanner reports.
      '@typescript-eslint/no-misused-promises': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='createElement']",
          message:
            'Use createEl or createDiv. The review scanner reports document.createElement.',
        },
        {
          selector:
            "CallExpression[callee.property.name='join'][arguments.0.value='.']",
          message:
            "Do not join parts with '.'. The review scanner reports it as domain assembly; slice the string instead.",
        },
      ],
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
    // Test helpers build detached DOM without Obsidian's helpers.
    files: ['src/test-utils/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
