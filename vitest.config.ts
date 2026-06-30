import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Needed for ESM packages: Vitest resolves .js imports to the .ts source
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/node_modules/**', '**/dist/**'],
    },
  },
});
