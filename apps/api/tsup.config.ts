import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  env: {
    NODE_ENV: 'production',
  },
  outDir: 'dist',
  target: 'node18',
  onSuccess: 'tsc --noEmit',
});
