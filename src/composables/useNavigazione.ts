import {
  PhChartLineUp,
  PhGearSix,
  PhHouse,
  PhListBullets,
  PhReceipt,
  PhTrendUp,
} from '@phosphor-icons/vue'
import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'

// Phosphor non esporta un tipo comune: ogni icona ha la stessa firma.
export type PhosphorIcon = typeof PhHouse

export type VoceNavigazione = {
  chiave: 'panoramica' | 'movimenti' | 'valori' | 'futuro' | 'fisco' | 'impostazioni'
  titolo: string
  percorso: string
  icona: PhosphorIcon
  attiva: boolean
}

export type UseNavigazioneReturn = {
  vociMobili: ComputedRef<VoceNavigazione[]>
  vociDesktop: ComputedRef<VoceNavigazione[]>
}

type VoceBase = Omit<VoceNavigazione, 'attiva'>

const PRINCIPALI: VoceBase[] = [
  { chiave: 'panoramica', titolo: 'Panoramica', percorso: '/', icona: PhHouse },
  { chiave: 'movimenti', titolo: 'Movimenti', percorso: '/movimenti', icona: PhListBullets },
  { chiave: 'valori', titolo: 'Valori', percorso: '/valori', icona: PhTrendUp },
  { chiave: 'futuro', titolo: 'Futuro', percorso: '/futuro', icona: PhChartLineUp },
]

const SOLO_DESKTOP: VoceBase[] = [
  { chiave: 'fisco', titolo: 'Fisco', percorso: '/fisco', icona: PhReceipt },
  { chiave: 'impostazioni', titolo: 'Impostazioni', percorso: '/impostazioni', icona: PhGearSix },
]

// Unica fonte per barra in basso e sidebar: la sidebar aggiunge Fisco e Impostazioni.
export function useNavigazione(): UseNavigazioneReturn {
  const route = useRoute()

  const conAttiva = (voci: VoceBase[]): VoceNavigazione[] =>
    voci.map((voce) => ({ ...voce, attiva: route.path === voce.percorso }))

  const vociMobili = computed(() => conAttiva(PRINCIPALI))
  const vociDesktop = computed(() => conAttiva([...PRINCIPALI, ...SOLO_DESKTOP]))

  return { vociMobili, vociDesktop }
}
