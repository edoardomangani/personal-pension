import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import VistaProfilo from './views/VistaProfilo.vue'
import VistaSegnaposto from './views/VistaSegnaposto.vue'

declare module 'vue-router' {
  interface RouteMeta {
    titolo?: string
    /** Testata mobile: principale col titolo e l'avatar, secondaria con la freccia indietro. */
    testata: 'principale' | 'secondaria'
    /** Dove porta la freccia indietro senza cronologia; solo sulle secondarie. */
    madre?: string
    /** «Registra» nella testata desktop. */
    registra?: boolean
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
    component: VistaSegnaposto,
    meta: { titolo: 'Account', testata: 'secondaria', madre: '/profilo' },
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
  // Condizione scritta qui e non in una funzione: in build Vite elimina il ramo e il chunk della vetrina.
  ...(import.meta.env.DEV
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

function titoloDocumento(titolo: string | undefined): string {
  return titolo ? `${titolo} · ${NOME_APP}` : NOME_APP
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: rotte,
})

router.afterEach((to) => {
  document.title = titoloDocumento(to.meta.titolo)
})
