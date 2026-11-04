import { centesimiInEuro, euroInCentesimi, sommaCentesimi } from './importi'
import { daVersare, stimaMensile, ultimoValore } from './posizione'
import type { Archivio, Centesimi } from '../types/dominio'

export type TipoContributo = 'TFR' | 'Datore' | 'Personale' | 'Volontario'

export interface PuntoProiezione {
  anno: number
  valore: Centesimi
  /** Partenza più i contributi fino a quell'anno. */
  versatoCumulato: Centesimi
}

export interface Simulazione {
  finale: Centesimi
  /** Contributi versati nella simulazione, senza la partenza. */
  totaleContributi: Centesimi
  /** Un punto per `annoInizio` e uno per ogni anno successivo: `anni + 1` punti. */
  serie: PuntoProiezione[]
}

export interface ParametriSimulazione {
  partenza: Centesimi
  contributoMensile: Centesimi
  /** % annua. */
  rendimento: number
  /** % annua di crescita dei contributi, applicata dopo ogni anno. */
  crescita: number
  anni: number
  annoInizio: number
}

export interface Scenario extends Simulazione {
  /** % annua. */
  rendimento: number
  finaleOggi: Centesimi
}

export type Proiezione =
  | {
      motivo: null
      anni: number
      annoPensione: number
      partenza: Centesimi
      contributi: Record<TipoContributo, Centesimi>
      scenari: [prudente: Scenario, atteso: Scenario, favorevole: Scenario]
    }
  | { motivo: 'manca-nascita' | 'anno-passato' }

/** Le impostazioni non `null` vincono sulla stima dalle buste. */
export function contributiMensili(
  archivio: Archivio,
  fondoId?: string,
): Record<TipoContributo, Centesimi> {
  const i = archivio.impostazioni
  return {
    TFR: i.tfrMensile ?? stimaMensile(archivio, 'TFR', fondoId),
    Datore: i.datoreMensile ?? stimaMensile(archivio, 'Datore', fondoId),
    Personale: i.personaleMensile ?? stimaMensile(archivio, 'Personale', fondoId),
    Volontario: i.volontarioMensile,
  }
}

// In euro float: arrotondare ogni mese sposterebbe i finali sui decenni.
export function simula(p: ParametriSimulazione): Simulazione {
  const rm = Math.pow(1 + p.rendimento / 100, 1 / 12) - 1
  const partenza = centesimiInEuro(p.partenza)
  let valore = partenza
  let contributo = centesimiInEuro(p.contributoMensile)
  let contributi = 0
  const serie: PuntoProiezione[] = [
    { anno: p.annoInizio, valore: p.partenza, versatoCumulato: p.partenza },
  ]
  for (let anno = 1; anno <= p.anni; anno++) {
    for (let mese = 0; mese < 12; mese++) {
      valore = valore * (1 + rm) + contributo
      contributi += contributo
    }
    serie.push({
      anno: p.annoInizio + anno,
      valore: euroInCentesimi(valore),
      versatoCumulato: euroInCentesimi(partenza + contributi),
    })
    contributo *= 1 + p.crescita / 100
  }
  return {
    finale: euroInCentesimi(valore),
    totaleContributi: euroInCentesimi(contributi),
    serie,
  }
}

export function inEuroDiOggi(valore: Centesimi, inflazione: number, anni: number): Centesimi {
  return euroInCentesimi(centesimiInEuro(valore) / Math.pow(1 + inflazione / 100, anni))
}

/** Stima: tre scenari a rendimento −2, atteso e +2 punti. */
export function proiezione(archivio: Archivio, oggi: string, fondoId?: string): Proiezione {
  const i = archivio.impostazioni
  if (i.annoNascita === null) return { motivo: 'manca-nascita' }
  const annoOggi = Number(oggi.slice(0, 4))
  const annoPensione = i.annoNascita + i.etaPensione
  const anni = annoPensione - annoOggi
  if (anni <= 0) return { motivo: 'anno-passato' }

  const partenza = sommaCentesimi([
    ultimoValore(archivio, fondoId)?.valore ?? 0,
    daVersare(archivio, fondoId).totale,
  ])
  const contributi = contributiMensili(archivio, fondoId)
  const contributoMensile = sommaCentesimi(Object.values(contributi))
  const scenario = (rendimento: number): Scenario => {
    const s = simula({
      partenza,
      contributoMensile,
      rendimento,
      crescita: i.crescita,
      anni,
      annoInizio: annoOggi,
    })
    return { ...s, rendimento, finaleOggi: inEuroDiOggi(s.finale, i.inflazione, anni) }
  }
  return {
    motivo: null,
    anni,
    annoPensione,
    partenza,
    contributi,
    scenari: [scenario(i.rendimento - 2), scenario(i.rendimento), scenario(i.rendimento + 2)],
  }
}
