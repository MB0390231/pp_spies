/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  // The game is the only production entry. The visual storybook stays available
  // on the dev server (Vite serves storybook.html directly), but is left out of
  // `vite build` so it never ships to the hosted site.
  const input: Record<string, string> = { main: 'index.html' }
  if (command !== 'build') input.storybook = 'storybook.html'

  return {
    plugins: [react()],
    build: {
      rollupOptions: { input },
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.ts'],
    },
  }
})
