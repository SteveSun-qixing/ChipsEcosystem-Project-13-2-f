import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['tests/**/*', 'node_modules/**/*'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@editor': resolve(__dirname, 'src/editor'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImageCardPlugin',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vue',
        '@chips/core',
        '@chips/sdk',
        '@chips/foundation',
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@chips/core': 'ChipsCore',
          '@chips/sdk': 'ChipsSDK',
          '@chips/foundation': 'ChipsFoundation',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
