// Senza import: chi stampa soltanto (es. genera-icone) non deve caricare pg.
export const scrivi = (riga: string) => process.stdout.write(riga + '\n')
