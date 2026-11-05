import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig((env) =>
  mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL('./', import.meta.url)),
      },
    }),
  ),
)
