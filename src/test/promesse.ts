/** Una promessa che si risolve o rifiuta quando lo decide il test. */
export function inSospeso<T>() {
  let risolvi: (valore: T) => void = () => {}
  let rifiuta: (motivo: unknown) => void = () => {}
  const promessa = new Promise<T>((r, x) => {
    risolvi = r
    rifiuta = x
  })
  return {
    promessa,
    risolvi: (valore: T) => risolvi(valore),
    rifiuta: (motivo: unknown) => rifiuta(motivo),
  }
}
