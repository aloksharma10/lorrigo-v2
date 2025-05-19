import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  env: {
    NODE_ENV: 'production',
  },
  outDir: 'dist',
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.alias = {
      '@/*': './src/*'
    };
  },
  loader: {
    '.css': 'css',
  },
  onSuccess: 'echo Build completed successfully!'
}); 