// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const leggi = (percorso: string) => readFileSync(join(process.cwd(), percorso), 'utf8')
// ciclo/ non va nelle PR: fuori dal branch di lavoro questi controlli si saltano.
const inCiclo = (percorso: string) => existsSync(join(process.cwd(), percorso))

// Il blocco di un job va dalla sua chiave (due spazi) alla chiave di job successiva o alla fine.
function job(workflow: string, nome: string): string {
  const righe = workflow.split('\n')
  const inizio = righe.indexOf(`  ${nome}:`)
  if (inizio === -1) throw new Error(`Job «${nome}» non trovato`)
  const dopo = righe.slice(inizio + 1).findIndex((r) => /^ {2}[\w-]+:/.test(r))
  const fine = dopo === -1 ? righe.length : inizio + 1 + dopo
  return righe.slice(inizio, fine).join('\n')
}

describe('deploy (PWA-01 R22-R23)', () => {
  const workflow = leggi('.github/workflows/ci.yml')
  const deploy = job(workflow, 'deploy')

  it('dipende dal job dei controlli', () => {
    expect(deploy).toMatch(/^ {4}needs: controlli$/m)
  })

  it('parte solo su push al branch main', () => {
    const condizione = deploy.split('\n').find((r) => r.startsWith('    if:'))
    expect(condizione).toContain("github.event_name == 'push'")
    expect(condizione).toContain("github.ref == 'refs/heads/main'")
  })

  it.each(['VITE_NEON_DATABASE_URL', 'VITE_NEON_AUTH_URL', 'VITE_NEON_DATA_API_URL'])(
    'legge %s dalle Variables',
    (nome) => {
      expect(deploy).toContain(`\${{ vars.${nome} }}`)
    },
  )

  it('ha i permessi di Pages solo nel job', () => {
    expect(deploy).toContain('pages: write')
    expect(deploy).toContain('id-token: write')
    const primaDeiJob = workflow.slice(0, workflow.indexOf('\njobs:'))
    expect(primaDeiJob).not.toContain('permissions')
    expect(job(workflow, 'controlli')).not.toContain('permissions')
  })

  it("usa l'environment github-pages e una concurrency", () => {
    expect(deploy).toContain('name: github-pages')
    expect(deploy).toMatch(/^ {4}concurrency:/m)
  })

  it.each(['actions/configure-pages@', 'actions/upload-pages-artifact@', 'actions/deploy-pages@'])(
    "usa l'azione ufficiale %s",
    (azione) => {
      expect(deploy).toContain(azione)
    },
  )

  it('fa la build di Pages', () => {
    expect(deploy).toContain('npm ci')
    expect(deploy).toContain('npm run build:pages')
  })

  it('non usa secrets', () => {
    expect(workflow).not.toContain('secrets.')
  })

  it('il job dei controlli prova e compila ancora', () => {
    const controlli = job(workflow, 'controlli')
    expect(controlli).toContain('npm test')
    expect(controlli).toContain('vite build')
  })
})

describe.skipIf(!inCiclo('ciclo/rilascio/PWA-01-pwa-manifest-service-worker-deploy.md'))(
  'rilascio (PWA-01 R24)',
  () => {
    const rilascio = inCiclo('ciclo/rilascio/PWA-01-pwa-manifest-service-worker-deploy.md')
      ? leggi('ciclo/rilascio/PWA-01-pwa-manifest-service-worker-deploy.md')
      : ''
    const passi = rilascio.slice(
      rilascio.indexOf('## Passi a mano'),
      rilascio.indexOf('## Attenzione'),
    )

    it('ha le sezioni «Passi a mano» e «Attenzione»', () => {
      expect(rilascio).toContain('## Passi a mano')
      expect(rilascio).toContain('## Attenzione')
    })

    it('i passi coprono Pages, Variables e dominio di Neon Auth', () => {
      expect(passi).toContain('«GitHub Actions»')
      expect(passi).toContain('Variables')
      for (const nome of ['VITE_NEON_DATABASE_URL', 'VITE_NEON_AUTH_URL', 'VITE_NEON_DATA_API_URL'])
        expect(passi).toContain(nome)
      expect(passi).toContain('https://edoardomangani.github.io')
      expect(passi).toContain('Neon Auth')
    })
  },
)
