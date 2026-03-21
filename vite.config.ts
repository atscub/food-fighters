import { defineConfig } from 'vite';

export default defineConfig({
  base: '/food-fighters/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
});
