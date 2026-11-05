import {
  createRouter,
  createWebHashHistory,
  type LocationQueryValue,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
} from 'vue-router'
import { useArchivioStore } from './stores/archivio'
import { useSessioneStore } from './stores/sessione'
import VistaAccount from './views/VistaAccount.vue'
import VistaProfilo from './views/VistaProfilo.vue'
import VistaSegnaposto from './views/VistaSegnaposto.vue'
import VistaAccedi from './views/accesso/VistaAccedi.vue'
import VistaBenvenuto from './views/accesso/VistaBenvenuto.vue'
import VistaNuovaPassword from './views/accesso/VistaNuovaPassword.vue'
import VistaPasswordDimenticata from './views/accesso/VistaPasswordDimenticata.vue'
import VistaRegistrati from './views/accesso/VistaRegistrati.vue'
import VistaVerifica from './views/accesso/VistaVerifica.vue'

declare module 'vue-router' {
  interface RouteMeta {
    titolo?: string
    /** Testata mobile delle rotte della shell: principale col titolo e l'avatar, secondaria con la freccia indietro. */
    testata?: 'principale' | 'secondaria'
    /** Dove porta la freccia indietro senza cronologia; solo sulle secondarie. */
    madre?: string
    /** «Registra» nella testata desktop. */
    registra?: boolean
    /** Pagina di accesso: fuori dalla shell, solo senza sessione. */
    accesso?: boolean
    /** Onboarding: fuori dalla shell, con la sessione e senza fondo. */
    primoAvvio?: boolean
    /** Pannello fisso a destra su desktop: il contenuto della shell gli lascia lo spazio. */
    pannello?: boolean
  }
}

const NOME_APP = 'Next'

export const rotte: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: VistaSegnaposto,
    meta: { titolo: 'Home', testata: 'principale', registra: true },
  },
  {
    path: '/movimenti',
    name: 'movimenti',
    component: VistaSegnaposto,
    meta: { titolo: 'Movimenti', testata: 'principale', registra: true },
  },
  {
    path: '/valori',
    name: 'valori',
    component: VistaSegnaposto,
    meta: { titolo: 'Valori', testata: 'principale', registra: true },
  },
  {
    path: '/futuro',
    name: 'futuro',
    component: VistaSegnaposto,
    meta: { titolo: 'Futuro', testata: 'principale' },
  },
  {
    path: '/profilo',
    name: 'profilo',
    component: VistaProfilo,
    meta: { titolo: 'Profilo', testata: 'secondaria', madre: '/' },
  },
  {
    path: '/account',
    name: 'account',
    component: VistaAccount,
    meta: { titolo: 'Account', testata: 'secondaria', madre: '/profilo', pannello: true },
  },
  {
    path: '/fisco',
    name: 'fisco',
    component: VistaSegnaposto,
    meta: { titolo: 'Fisco', testata: 'secondaria', madre: '/profilo' },
  },
  {
    path: '/impostazioni',
    name: 'impostazioni',
    component: VistaSegnaposto,
    meta: { titolo: 'Impostazioni', testata: 'secondaria', madre: '/profilo' },
  },
  {
    path: '/accedi',
    name: 'accedi',
    component: VistaAccedi,
    meta: { titolo: 'Accedi', accesso: true },
  },
  {
    path: '/registrati',
    name: 'registrati',
    component: VistaRegistrati,
    meta: { titolo: 'Crea account', accesso: true },
  },
  {
    path: '/verifica',
    name: 'verifica',
    component: VistaVerifica,
    meta: { titolo: 'Controlla la posta', accesso: true },
    // R15: senza l'email a cui è arrivato il codice non c'è niente da verificare.
    beforeEnter: (to) =>
      typeof to.query.email === 'string' && to.query.email.trim() !== '' ? true : '/registrati',
  },
  {
    path: '/password-dimenticata',
    name: 'password-dimenticata',
    component: VistaPasswordDimenticata,
    meta: { titolo: 'Password dimenticata', accesso: true },
  },
  {
    path: '/nuova-password',
    name: 'nuova-password',
    component: VistaNuovaPassword,
    meta: { titolo: 'Nuova password', accesso: true },
  },
  {
    path: '/benvenuto',
    name: 'benvenuto',
    component: VistaBenvenuto,
    meta: { titolo: 'Benvenuto', primoAvvio: true },
  },
  // Vetrina in sviluppo e nella copia di collaudo; condizione in linea perché in produzione Vite elimini il ramo e il chunk.
  ...(import.meta.env.DEV || import.meta.env.MODE === 'collaudo'
    ? ([
        {
          path: '/dev/ui',
          name: 'dev.ui',
          component: () => import('./views/dev/VistaVetrina.vue'),
          meta: { titolo: 'Vetrina dei componenti', testata: 'principale' },
        },
      ] satisfies RouteRecordRaw[])
    : []),
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function titoloDocumento(titolo: string | undefined): string {
  return titolo ? `${titolo} · ${NOME_APP}` : NOME_APP
}

/** R10: `da` vale solo se è una rotta interna, altrimenti Home. */
export function rottaDiRitorno(da: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (typeof da !== 'string' || !da.startsWith('/') || da.startsWith('//')) return '/'
  return da
}

/** URL assoluto di una rotta dell'app, per i ritorni da Google e dalle email di reset. */
export function urlApp(percorso: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#${percorso}`
}

/** R9. Esportato a parte: i test lo montano su un router in memoria. */
export async function guardAccesso(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  if (to.name === 'dev.ui') return true
  const sessione = useSessioneStore()
  await sessione.ripristina()
  const utente = sessione.utente
  const diAccesso = to.meta.accesso === true

  if (utente === null) {
    if (diAccesso) return true
    return to.fullPath === '/' ? '/accedi' : { path: '/accedi', query: { da: to.fullPath } }
  }
  if (diAccesso) return '/'

  const haFondo = await useArchivioStore().controllaFondo()
  // Durante la lettura l'utente può essere uscito o cambiato: si decide di nuovo da capo.
  if (sessione.utente?.id !== utente.id) return guardAccesso(to)
  // Errore di lettura: si va dove chiesto e la vista mostra il suo errore.
  if (haFondo === null) return true
  if (!haFondo) return to.meta.primoAvvio === true ? true : '/benvenuto'
  return to.meta.primoAvvio === true ? '/' : true
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: rotte,
})

router.beforeEach(guardAccesso)

router.afterEach((to) => {
  document.title = titoloDocumento(to.meta.titolo)
})
