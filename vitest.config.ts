import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Two test projects with different runtimes:
 *
 *   lambda  → Node. Pure functions over plain data (the clue validator, schema
 *             conversion, hint construction, every game's generator, reviewer
 *             and judge). These are the tests that matter most: a false pass
 *             in a reviewer ships a broken puzzle as the day's game.
 *   web     → jsdom. Hooks and pure helpers from the React app, plus the
 *             contract test that real generator output parses on the frontend.
 *
 * Coverage thresholds are enforced in CI (`npm run test:coverage`) so the
 * validators can't quietly lose coverage as mechanisms and games are added.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'lambda',
          environment: 'node',
          include: ['lambda/**/*.test.js'],
          globals: true,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { '@': path.resolve(__dirname, './src') },
        },
        test: {
          name: 'web',
          environment: 'jsdom',
          // jsdom only exposes localStorage on a real origin; its default
          // about:blank document has an opaque one, so storage is undefined.
          environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          globals: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: [
        'lambda/games/**/*.js',
        'lambda/shared/runtime/**/*.js',
        'lambda/shared/sources/**/*.js',
        'lambda/shared/clients/providers/_schemaUtils.js',
        'src/app/hooks/**/*.ts',
      ],
      thresholds: {
        // The clue validator and hint builder are the correctness core.
        'lambda/games/cryptic/{pipeline.js,builder/**,generator/**,validator/**}': {
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 85,
        },
        // Every game's lifecycle runs through this; a regression ships to all seven.
        'lambda/shared/runtime/gameHandler.js': {
          statements: 85,
          branches: 75,
          functions: 85,
          lines: 85,
        },
      },
    },
  },
});
