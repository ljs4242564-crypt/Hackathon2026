import { readFileSync } from 'node:fs'
import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode, command }) => {
  if (mode === 'client') {
    return {
      plugins: [react(), tailwindcss()],
      build: {
        copyPublicDir: false,
        rollupOptions: {
          input: './src/frontend/main.tsx',
          output: {
            dir: './dist/static',
            entryFileNames: 'client.js',
            assetFileNames: 'client.[ext]'
          }
        }
      }
    }
  }

  const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  const commitSha = process.env.CF_PAGES_COMMIT_SHA?.trim() || 'local-development'
  const metadata = {
    appVersion: packageJson.version,
    releaseId: process.env.RELEASE_ID?.trim() || commitSha,
    commitSha,
    builtAt: command === 'build' ? new Date().toISOString() : 'local-development',
  }
  return {
    define: { __APP_BUILD_METADATA__: JSON.stringify(metadata) },
    plugins: [
      build(),
      devServer({
        adapter,
        entry: 'src/index.tsx'
      })
    ]
  }
})
