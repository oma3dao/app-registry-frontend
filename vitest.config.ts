/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    watch: false, // Disable watch mode by default
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/tests/e2e/**'],
    server: {
      deps: {
        inline: ['ethers'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/.vercel/**',
        '**/public/**',
        '**/next.config.*',
        '**/tailwind.config.*',
        '**/postcss.config.*',
        '**/vercel.json',
        '**/.eslintrc.*',
        '**/tsconfig.json',
        '**/vitest.config.*',
        '**/package.json',
        '**/package-lock.json',
        '**/README.md',
        '**/.gitignore',
        '**/.husky/**',
        '**/.github/**',
        '**/src/app/favicon.ico',
        '**/src/app/globals.css',
        '**/src/app/layout.tsx',
        '**/src/app/page.tsx',
        '**/src/app/client.ts',
        '**/src/abi/**',
        '**/src/types/**',
        '**/src/config/**',
        '**/src/contracts/**'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 78,
          lines: 84,
          statements: 84
        }
      },
      // Allow coverage to fail without breaking CI (for PRs that only add E2E tests)
      allowExternal: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}) 