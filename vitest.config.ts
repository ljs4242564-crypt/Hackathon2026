import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: process.env.RUN_LIVE_TESTS === '1'
      ? ['tests/live/**/*.test.ts']
      : ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', ...(process.env.RUN_LIVE_TESTS === '1' ? [] : ['tests/live/**'])],
  },
})
