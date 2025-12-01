import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Limit to 2 workers to keep MacBook Air cool
    maxWorkers: 2,
    // Increase hook timeout to prevent timeouts during DB setup
    hookTimeout: 30000,
    testTimeout: 60000,
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

