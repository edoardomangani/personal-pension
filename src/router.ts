import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import VistaVuota from './views/VistaVuota.vue'

export const rotte: RouteRecordRaw[] = [{ path: '/', name: 'home', component: VistaVuota }]

export const router = createRouter({
  history: createWebHashHistory(),
  routes: rotte,
})
