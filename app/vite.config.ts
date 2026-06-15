import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build modes:
//  - default       -> served from polymachy.com/app (assets under /app/)
//  - --mode singlefile -> one self-contained index.html in preview/ that
//    runs from file:// with nothing connected to polymachy.com (review build)
export default defineConfig(({ mode }) => {
  const single = mode === 'singlefile';
  return {
    base: single ? './' : '/app/',
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: single
      ? { outDir: 'preview', cssCodeSplit: false, assetsInlineLimit: 100_000_000, reportCompressedSize: false }
      : {},
  };
});
