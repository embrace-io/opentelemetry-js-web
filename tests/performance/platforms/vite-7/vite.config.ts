import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'bundle.js', // or different name if you split code
        assetFileNames: 'bundle.[ext]', // for CSS, images, etc.
      },
    },
  },
});
