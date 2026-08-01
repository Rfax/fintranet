/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Tests cover pure selection and formatting logic, so no DOM is needed.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
