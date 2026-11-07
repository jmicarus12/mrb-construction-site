import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js lives in its own lazily loaded chunk (src/scene.js), so a big chunk is expected
    chunkSizeWarningLimit: 800
  }
});
