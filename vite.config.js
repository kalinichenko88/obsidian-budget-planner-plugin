import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: process.env.VITEST
    ? {
        conditions: ['browser'],
      }
    : undefined,
});
