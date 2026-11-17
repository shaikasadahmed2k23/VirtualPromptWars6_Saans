import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  // The shared workspace ships TypeScript source, so bundle it into the server output.
  deps: { alwaysBundle: ['@saans/shared'] },
});
