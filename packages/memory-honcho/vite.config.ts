import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'UntkernetKernelMemoryHoncho',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['@unternet/kernel', '@honcho-ai/sdk'],
    },
  },
});
