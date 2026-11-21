import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    conditions: ['browser', 'development'],
    alias: {
      'virtual:languages': path.resolve(
        __dirname,
        'scripts/languages-virtual.mjs'
      ),
      obsidian: path.resolve(
        __dirname,
        'src/test-utils/obsidian-vitest-stub.ts'
      ),
      main: path.resolve(__dirname, 'main.ts'),
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**/*.ts'],
    },
  },
});
