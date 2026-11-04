import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { scrivi } from './lib/output'

const CARTELLA = join(import.meta.dirname, '..', 'icons')
const RAGGIO_FONDO = ' rx="40"'

function rendi(svg: string, lato: number, nome: string): void {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: lato } }).render().asPng()
  writeFileSync(join(CARTELLA, nome), png)
  scrivi(`${nome} ${lato}×${lato}`)
}

function main(): void {
  const app = readFileSync(join(CARTELLA, 'icon-app.svg'), 'utf8')
  if (!app.includes(RAGGIO_FONDO)) throw new Error(`icon-app.svg: manca il raggio${RAGGIO_FONDO}.`)

  rendi(app, 512, 'icon-512.png')
  rendi(app, 192, 'icon-192.png')
  // iOS arrotonda da sé: il PNG va a fondo pieno fino ai bordi.
  rendi(app.replace(RAGGIO_FONDO, ''), 180, 'apple-touch-icon.png')
}

try {
  main()
} catch (e: unknown) {
  process.stderr.write(`icone: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
}
