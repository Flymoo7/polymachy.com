import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from polymachy.com/app — assets must resolve under that subpath.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
});
