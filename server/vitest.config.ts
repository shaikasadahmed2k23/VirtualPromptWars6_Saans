import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts only wires real dependencies and calls listen(); everything it uses is tested.
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
        // Pure domain logic has no I/O to excuse untested paths.
        'src/domain/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
