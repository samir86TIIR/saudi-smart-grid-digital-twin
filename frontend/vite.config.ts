import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path defaults to the GitHub Pages repository subpath in production.
// Override with VITE_BASE_PATH=/ when deploying to a custom domain or Kubernetes Ingress.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? (mode === 'production' ? '/saudi-smart-grid-digital-twin/' : '/'),
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
}));
