import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/calcetto/',  // ⚠️ Specifica per calcetto-app
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 5175,  // ⚠️ Mantieni porte diverse tra progetti
    strictPort: false,
    host: '0.0.0.0',
    //headers: {
    //  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    //  'Cross-Origin-Embedder-Policy': 'require-corp',
    //},
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});