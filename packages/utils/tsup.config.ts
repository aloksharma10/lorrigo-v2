import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/validations/index.ts', 'src/helpers/index.ts'],
    format: ['cjs'],
    dts: false,
    outDir: 'dist/cjs',
    sourcemap: true,
    clean: true,
    minify: true,
    treeshake: true,
    target: 'node18',
  },
  {
    entry: ['src/index.ts', 'src/validations/index.ts', 'src/helpers/index.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist/esm',
    sourcemap: true,
    clean: false,
    minify: true,
    treeshake: true,
    target: 'node18',
  },
]);
