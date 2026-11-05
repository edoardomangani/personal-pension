// Immagini di avvio di iOS (apple-touch-startup-image): solo funzioni pure, le usa genera-icone.

export interface Schermo {
  punti: { larghezza: number; altezza: number }
  densita: number
}

const FONDO = '#060708'
const GESSO = '#f3f5f2'
// Lato del segno sulla larghezza: 112 su 390, come la Misura «Avvio» del riferimento.
const QUOTA_SEGNO = 0.287

const schermo = (larghezza: number, altezza: number, densita: number): Schermo => ({
  punti: { larghezza, altezza },
  densita,
})

// iPhone in verticale, in punti × densità.
export const SCHERMI: readonly Schermo[] = [
  schermo(375, 667, 2),
  schermo(414, 736, 3),
  schermo(375, 812, 3),
  schermo(414, 896, 2),
  schermo(414, 896, 3),
  schermo(390, 844, 3),
  schermo(428, 926, 3),
  schermo(393, 852, 3),
  schermo(430, 932, 3),
  schermo(402, 874, 3),
  schermo(440, 956, 3),
]

export function pixel(s: Schermo): { larghezza: number; altezza: number } {
  return { larghezza: s.punti.larghezza * s.densita, altezza: s.punti.altezza * s.densita }
}

export function nomeFile(s: Schermo): string {
  const { larghezza, altezza } = pixel(s)
  return `avvio-${larghezza}x${altezza}.png`
}

export function latoSegno(larghezza: number): number {
  return Math.round(QUOTA_SEGNO * larghezza)
}

// Il contenuto dell'<svg> annidato di icon.svg: pillola e punto nel riquadro 256×256.
export function estraiSegno(iconSvg: string): string {
  const trovato = /<svg[^>]*viewBox="0 0 256 256"[^>]*>([\s\S]*?)<\/svg>/.exec(iconSvg)
  const segno = trovato?.[1]?.trim()
  if (!segno) throw new Error('icon.svg: manca il segno nel riquadro 256×256.')
  return segno
}

export function svgAvvio(s: Schermo, segno: string): string {
  const { larghezza, altezza } = pixel(s)
  const lato = latoSegno(larghezza)
  const x = (larghezza - lato) / 2
  const y = (altezza - lato) / 2
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${larghezza}" height="${altezza}" viewBox="0 0 ${larghezza} ${altezza}">`,
    `<rect width="${larghezza}" height="${altezza}" fill="${FONDO}"/>`,
    `<svg x="${x}" y="${y}" width="${lato}" height="${lato}" viewBox="0 0 256 256" fill="${GESSO}">`,
    segno,
    '</svg>',
    '</svg>',
  ].join('\n')
}
