/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Two entries: the game (index.html) and the visual storybook (storybook.html).
    // Paths are resolved relative to the project root.
    rollupOptions: {
      input: {
        main: 'index.html',
        storybook: 'storybook.html',
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
