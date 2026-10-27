/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Tout le contenu pédagogique est embarqué dans le bundle principal (~180 Ko gzip) : acceptable pour un site statique.
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
