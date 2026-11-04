import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import VistaSegnaposto from './views/VistaSegnaposto.vue'

declare module 'vue-router' {
  interface RouteMeta {
    titolo?: string
  }
}

const NOME_APP = 'Piano pensione'

export const rotte: RouteRecordRaw[] = [
  { path: '/', name: 'panoramica', component: VistaSegnaposto, meta: { titolo: 'Panoramica' } },
  {
    path: '/movimenti',
    name: 'movimenti',
    component: VistaSegnaposto,
    meta: { titolo: 'Movimenti' },
  },
  { path: '/valori', name: 'valori', component: VistaSegnaposto, meta: { titolo: 'Valori' } },
  { path: '/futuro', name: 'futuro', component: VistaSegnaposto, meta: { titolo: 'Futuro' } },
  { path: '/fisco', name: 'fisco', component: VistaSegnaposto, meta: { titolo: 'Fisco' } },
  {
    path: '/impostazioni',
    name: 'impostazioni',
    component: VistaSegnaposto,
    meta: { titolo: 'Impostazioni' },
  },
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
