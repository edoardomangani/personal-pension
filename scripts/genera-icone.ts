import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { SCHERMI, estraiSegno, nomeFile, pixel, svgAvvio } from './lib/avvio'
import { scrivi } from './lib/output'

const CARTELLA = join(import.meta.dirname, '..', 'icons')
const RAGGIO_FONDO = ' rx="40"'

function rendi(svg: string, lato: number, nome: string, altezza = lato): void {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: lato } }).render().asPng()
  writeFileSync(join(CARTELLA, nome), png)
  scrivi(`${nome} ${lato}×${altezza}`)
}

function main(): void {
  const app = readFileSync(join(CARTELLA, 'icon-app.svg'), 'utf8')
  if (!app.includes(RAGGIO_FONDO)) throw new Error(`icon-app.svg: manca il raggio${RAGGIO_FONDO}.`)

  rendi(app, 512, 'icon-512.png')
  rendi(app, 192, 'icon-192.png')
  // iOS arrotonda da sé: il PNG va a fondo pieno fino ai bordi.
  rendi(app.replace(RAGGIO_FONDO, ''), 180, 'apple-touch-icon.png')

  // La maskable è già a pieno quadro: il ritaglio lo fa il sistema.
  const maskable = readFileSync(join(CARTELLA, 'icon-maskable.svg'), 'utf8')
  if (maskable.includes(' rx=')) throw new Error('icon-maskable.svg: il fondo non va arrotondato.')
  rendi(maskable, 512, 'icon-maskable-512.png')

  const segno = estraiSegno(readFileSync(join(CARTELLA, 'icon.svg'), 'utf8'))
  mkdirSync(join(CARTELLA, 'avvio'), { recursive: true })
  for (const schermo of SCHERMI) {
    const { larghezza, altezza } = pixel(schermo)
    rendi(svgAvvio(schermo, segno), larghezza, join('avvio', nomeFile(schermo)), altezza)
  }
}

try {
  main()
} catch (e: unknown) {
  process.stderr.write(`icone: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
}
