import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'

const CARTELLA_ICONE = fileURLToPath(new URL('./icons', import.meta.url))

export function basePer(mode: string): string {
  return mode === 'pages' ? '/personal-pension/' : '/'
}

export const opzioniPwa: Partial<VitePWAOptions> = {
  strategies: 'generateSW',
  registerType: 'autoUpdate',
  // registerSW.js registra e basta: nessuna ricarica della pagina aperta.
  injectRegister: 'script',
  // Le icone arrivano in dist da copiaIcone() e le prende il glob del precache.
  includeManifestIcons: false,
  manifest: {
    name: 'Next',
    short_name: 'Next',
    description: 'Il tuo fondo pensione: versato, crescita e TFR da versare.',
    lang: 'it',
    dir: 'ltr',
    display: 'standalone',
    start_url: './',
    scope: './',
    theme_color: '#060708',
    background_color: '#060708',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{html,js,css,woff2,svg,png}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
  },
}

function fileIn(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(voce.parentPath, voce.name)
    return voce.isDirectory() ? fileIn(percorso) : [percorso]
  })
}

// Porta icons/ in dist/icons/ senza una cartella public/: il manifest vuole path fissi.
function copiaIcone(): Plugin {
  return {
    name: 'next:copia-icone',
    apply: 'build',
    generateBundle() {
      for (const file of fileIn(CARTELLA_ICONE)) {
        this.emitFile({
          type: 'asset',
          fileName: `icons/${relative(CARTELLA_ICONE, file).split('\\').join('/')}`,
          source: readFileSync(file),
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: basePer(mode),
  plugins: [vue(), tailwindcss(), copiaIcone(), VitePWA(opzioniPwa)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
