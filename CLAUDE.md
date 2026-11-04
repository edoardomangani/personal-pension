# Piano pensione — handoff per Claude Code

App personale di Edoardo per seguire il suo fondo pensione (Amundi Seconda Pensione). Nasce come artefatto su claude.ai (prototipo funzionante in `prototype/index.html`) e va portata a **PWA vera**: pagina statica su **GitHub Pages**, dati su **Neon** (Postgres + Neon Auth + Data API + RLS), senza server da mantenere.

**Questo è un punto di partenza, non una specifica.** Edoardo vuole rivedere diverse scelte: quello che segue descrive cosa esiste oggi e perché, non vincoli. Prima di scrivere codice fai con lui il giro delle decisioni aperte (sezione sotto) e aggiorna questo file con quello che decidete.

Lingua dell'interfaccia e del codice visibile: italiano, dando del tu. Formati it-IT, euro (`Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',useGrouping:'always'})`), segno − (U+2212) per spese.

## Decisioni prese (4 nov 2026)

- **Stack**: Vue 3 + Vite + TypeScript, SPA statica su GitHub Pages; dati su Neon (Auth + Data API + RLS).
- **Base dal prototipo: solo la logica** (modello dati e calcoli). Le sezioni "Interfaccia attuale" qui sotto e `DESIGN.md` descrivono il prototipo, non sono un riferimento.
- **Stile: il design system di Wallet** (artefatto "Wallet Design System" su claude.ai: vetro, Bricolage Grotesque, pill, due densità, Phosphor, shadcn-vue + Tailwind) **con colori propri**: mattone `#f05a28` per i testi di contesto che spiegano (come la tinta di Wallet: «al netto delle spese», «calcolato dalle buste»), il bagliore e il focus, mai sulle cifre; salvia `#8fd4a8` per le cifre positive; pulsante + e importi da versare bianchi; campi a righe come iOS. Si definisce in DS-01 (canvas con `/impeccable`, poi `prova/design` e `/porta-riferimento`).
- **Modello dati rivisto** (supera § Modello dati attuale): buste paga con righe TFR/Datore/Personale, movimenti con righe TFR/Datore/Personale/Volontario/Spesa, estratti conto; le buste versate si collegano al movimento. Multiutente con piani separati. Dettagli nel brief di DAT-01.
- **Lavoro col ciclo kit** (`ciclo/`, profilo in `ciclo/PROFILO.md`): dati e design si rivedono come voci, con brief e specifiche.

## Convenzioni del progetto

Le leggono chi scrive le specifiche, chi pianifica, chi esegue e chi fa la review. Pacchetto di stack: nessuno (non c'è un default del kit per questo stack).

### Struttura

- Codice in `src/` per responsabilità: `calc/` (funzioni pure), `data/` (Neon e auth), `stores/` (stato, Pinia), `composables/` (logica riusabile di interfaccia), `views/` (una per rotta), `components/` (UI, `dev/` per la vetrina), `types/`, `styles/`.
- Test accanto al file che provano, `nome.test.ts`. Rotte e guard in `src/router.ts`, Vue Router in modalità hash.
- Schema del DB in `db/migrations/NNN_nome.sql`; script Node (import, collaudo) in `scripts/`.

### Logica

- Ogni calcolo (versato, crescita, XIRR, TFR da versare, deducibilità, proiezione) è una funzione pura in `src/calc/`, senza Vue né I/O: store, viste e composables non calcolano, chiamano.
- In memoria gli importi sono **centesimi interi** (`number` intero, tipo `Centesimi`); conversione da/verso euro solo al bordo (`src/data/`, campi dei form, formattazione). Somme e confronti sempre sui centesimi.
- Date come stringhe ISO `YYYY-MM-DD` (mese di competenza `YYYY-MM`), confrontate come stringhe; niente `Date` per la logica di calendario.

### Input

- Ogni modulo ha un validatore puro `validaX(bozza)` che restituisce gli errori per campo, in italiano; il componente li mostra sotto il campo.
- Numeri digitati letti in formato it-IT (virgola decimale, punto delle migliaia ignorato) da un solo helper.
- I vincoli `check` del DB sono l'ultima difesa, non la validazione: un errore di vincolo che arriva all'utente è un bug.

### Autorizzazione

- Ogni tabella ha RLS con policy `user_id = auth.user_id()` e `user_id default auth.user_id()`: il client non invia `user_id` e non filtra per utente come misura di sicurezza.
- Login con Neon Auth; ogni vista dati sta dietro il guard del router; sessione scaduta → ritorno al login senza perdere la rotta.
- Nel bundle solo configurazione pubblica (`VITE_*`); stringhe di connessione e chiavi segrete mai nel frontend né nel repo.

### Risposte e livello dati

- Solo `src/data/` parla con Neon: un modulo per tabella (`versamenti.ts`, `tfr.ts`, …) che mappa `snake_case` ↔ `camelCase` ed euro ↔ centesimi.
- Errori normalizzati in un tipo unico (`rete`, `sessione`, `vincolo`, `altro`) con un messaggio in italiano; i componenti non vedono risposte HTTP.
- Ogni vista gestisce caricamento, errore (con riprova), vuoto e primo avvio.

### Dati

- Migration SQL numerate in `db/migrations/`, solo in avanti, idempotenti dove si può (`if not exists`); `db/schema.sql` del handoff diventa la `001`.
- Ogni tabella nuova nasce con RLS, policy e `grant` al ruolo della Data API nella stessa migration.
- Una migration si prova sul branch Neon `collaudo`; sul branch `main` (dati veri) va a mano dopo il merge, come passo di rilascio.

### Frontend

- Vue 3 `<script setup lang="ts">`, `defineProps<T>()` e `defineEmits<T>()` tipizzati, props mai mutate; logica riusabile in composables; cleanup in `onUnmounted`.
- Stato con Pinia, setup store, uno per dominio in `src/stores/` (`sessione`, `dati`, `impostazioni`…): caricano da `src/data/` e derivano con `src/calc/`. I componenti leggono dagli store, non da `src/data/`.
- Al logout e al cambio di account ogni store si svuota (`reset()` esplicito, chiamato dallo store della sessione), con un test che lo verifica: nessun dato di un utente resta in memoria per il successivo.
- Componenti: shadcn-vue (stile new-york-v4, primitive reka-ui) in `src/components/ui/`, con le varianti del design system; icone `@phosphor-icons/vue`, mai `lucide`. Componenti dell'app in `src/components/`.
- Stili: Tailwind v4; i token del design system sono le variabili CSS di shadcn in `src/styles/app.css` (`:root` e `@theme inline`), un solo tema scuro. Classi Tailwind nei template, solo con i token (niente valori arbitrari `[#…]`, `[13px]`); niente `style=""`; `<style scoped>` solo per ciò che Tailwind non esprime.
- Ogni componente del design system sta nella vetrina (`docs/convenzioni-vetrina.md`); chi lo cambia aggiorna la vetrina nello stesso lavoro.
- Formattazione di importi, date e percentuali da un solo modulo (`src/calc/formato.ts`), it-IT, segno − (U+2212).
- Accessibilità: etichette sui campi, `aria-label` sui pulsanti con sola icona, aree di tocco ≥ 44px, `prefers-reduced-motion` rispettato.

### Test

- Vitest: ogni funzione di `src/calc/` ha test, con `data/seed.json` come fixture e i totali del handoff come atteso (TFR 2.659,15 €; versato 1.591,91 €; da versare 1.067,24 €; spese 15,00 €; ultimo valore 1.641,45 €).
- `src/data/` con `fetch` finto: mappature, errori, sessione scaduta. Validatori con casi validi e non validi.
- Componenti con `@vue/test-utils` solo dove c'è logica (es. spunta dei mesi di TFR e ricalcolo dell'importo). Il browser lo copre il collaudo; niente suite e2e committata.

### Divieti

- `console.log` e `debugger` nel codice consegnato; `any` in TypeScript.
- Segreti, chiavi o stringhe di connessione nel bundle o nel repo (solo `VITE_*` pubbliche).
- `v-html` con dati; `fetch` fuori da `src/data/`.
- Aritmetica sugli importi fuori dagli helper dei centesimi; colori e misure fuori dai token (valori arbitrari di Tailwind compresi); icone fuori da Phosphor.

## Cosa c'è in questa cartella

| File | Cosa |
|---|---|
| `prototype/index.html` | L'app com'è oggi: un solo file, HTML+CSS+JS, Chart.js da cdnjs, icone Phosphor inline in uno sprite SVG. Usa `claude.use("db")` (archivio dell'artefatto): è la parte da sostituire. |
| `PRODUCT.md` | Chi la usa, a cosa serve, principi (formato Impeccable). |
| `DESIGN.md` | Sistema visivo attuale: colori, tipo, misure. Deriva dal design system "Wallet" di Edoardo, con colori propri. |
| `db/schema.sql` | Bozza di schema Postgres con RLS per Neon. Da verificare sulla doc Neon (vedi sotto). |
| `data/seed.json` | Dati reali al 4 nov 2026, da importare. |
| `icons/` | Icona app (graphite, collina avorio, sole arancio): svg, 512, 192, 180 (apple-touch). |

## Modello dati attuale

Due cose diverse, da non confondere:

- **TFR accumulato** (`tfr_accumulato`): una riga per busta paga, con mese di competenza, data busta paga, importo. Finché non è collegato a un versamento è **"da versare"**.
- **Versamenti** (`versamenti`): soldi arrivati davvero sul fondo, con `tipo` = `TFR` | `Personale` | `Datore` | `Spesa`.
  - Un versamento `TFR` **raccoglie i mesi di TFR accumulato** che copre (relazione `tfr_accumulato.versamento_id`). Nel modulo si spuntano i mesi da versare e l'importo si calcola dalla somma (resta modificabile perché il fondo può differire di centesimi).
  - `Spesa` = commissioni/costi del piano: si sottrae dal versato netto.
- **Estratti conto** (`estratti_conto`): data + valore della posizione dall'estratto del fondo.
- **Impostazioni**: anno di nascita (1994), età pensione (67), ipotesi della proiezione, aliquota IRPEF marginale (35%), limite deducibile (5.164,57 €).
- Multi-fondo previsto (`fondi`), oggi uno solo.

## Calcoli (sono nel prototipo, funzioni con lo stesso nome)

- **Versato al giorno X** = somma dei versamenti non-Spesa con `data <= X` (`accreditatoAl`).
- **Crescita** = ultimo valore − versato alla stessa data; % = valore/versato − 1. Già al netto delle spese.
- **Rendimento annuo** = XIRR (bisezione) con flussi = versamenti non-Spesa negativi alla loro data + ultimo valore positivo. **Mostrarlo solo con almeno 12 mesi di storia**: prima esce gonfiato (oggi ~+15%) e confonde.
- **TFR da versare** = somma TFR accumulato senza versamento.
- **Deducibilità** = Personale + Datore nell'anno (il TFR non conta), limite unico su tutti i fondi; risparmio = min(versato, limite) × aliquota.
- **Proiezione** = capitalizzazione mensile da (ultimo valore + TFR da versare) fino a anno nascita + età pensione; contributi mensili (TFR stimato come mediana degli ultimi 6 mesi, così la tredicesima non sporca) che crescono ogni anno; tre scenari (rendimento −2, atteso, +2); valore anche in euro di oggi con l'inflazione. Etichettarla sempre come stima.

## Interfaccia attuale

- **Solo tema scuro.** Fondo #0e0e0d con leggero bagliore arancio, superfici "vetro" (bianco 6/9/12%, bordo 0,75px, filo di luce inset). Font **Geist** (scelto da Edoardo). Dettagli in `DESIGN.md`.
- **Colori con ruoli fissi**: verde salvia #8fd4a8 = positivi (guadagni, valore, versato); ambra #e3a64b = TFR da versare; rosso #ff7a6b = spese ed eliminazioni; arancio #f05a28 = solo focus/cursore e pulsante "Registra" su desktop; pulsanti principali chiari su scuro. Edoardo ha scartato: rosso/arancio per cose positive, il verde scuro come colore base, look da banca, look giocoso.
- **Telefono**: titolo 22, saldo 56 con decimali 26 tenui, liste raggruppate con righe 52px e icone in tile 28px, controlli a pillola, moduli come sheet dal basso con maniglia. **Barra in basso ancorata e a tutta larghezza** (non pillola fluttuante) come la Home "Definitive" di Wallet: sfondo sfumato e sfocato che sale 24px, voci con icona 24 (piena se attiva) ed etichetta 10/600, **+ centrale cerchio 56 chiaro su scuro**. Voci: Panoramica, Movimenti, +, Valori, Futuro (Fisco raggiungibile dalla riga "Sconto IRPEF").
- **Desktop ≥900px**: sidebar 240 con pulsante "Registra", testata sticky 52 sfocata, densità compatta (righe 40, controlli 32), Panoramica su due colonne.
- Icone **Phosphor** peso regular (fill per la tab attiva).
- Riferimenti visivi su claude.ai (account Edoardo): artefatto "Wallet Design System" e canvas "Wallet — esplorazione stili mobile", pagina "Definitive".

## Decisioni da rivedere con Edoardo prima di partire

Chiedile una alla volta o a gruppi piccoli, proponendo un'opzione consigliata; non darle per scontate.

- **Stack**: HTML/JS puro come il prototipo, oppure Vite + TypeScript (+ eventuale framework).
- **Hosting e dati**: GitHub Pages + Neon è l'ipotesi di partenza; alternative valutate: Supabase (login e API già pronti), Cloudflare Pages, solo dati locali (IndexedDB) senza sincronizzazione.
- **Modello dati**: TFR accumulato separato dai versamenti, tipi di versamento, spese come versamento negativo, multi-fondo. Va bene così o va ripensato?
- **Funzioni**: quali tenere (panoramica, deducibilità, proiezione a 3 scenari, export) e cosa aggiungere o togliere.
- **Numeri mostrati**: rendimento annuo nascosto sotto i 12 mesi, crescita netta delle spese, stima del TFR mensile con la mediana.
- **Design**: palette, Geist, barra in basso stile Wallet, layout desktop. Edoardo ha già cambiato idea più volte: proponi, non imporre.

## Piano di massima (da confermare dopo il giro sopra)

1. **Repo e struttura.** Vite + TypeScript va bene, oppure HTML/JS puro come il prototipo: chiedi a Edoardo cosa preferisce prima di scegliere. Deve uscire tutto statico per GitHub Pages (base path del repo, workflow GitHub Actions per il deploy).
2. **Neon.** Creare il progetto (regione EU), attivare **Neon Auth** e la **Data API**, applicare `db/schema.sql` *dopo* aver verificato nella doc Neon: nome della funzione utente nel JWT (`auth.user_id()`), ruolo concesso alla Data API (`authenticated`), configurazione CORS/domini per GitHub Pages. Il connettore Neon MCP può fare tutto (`provision_neon_auth`, `provision_neon_data_api`, `run_sql`, `add_auth_trusted_domain`).
3. **Login.** Un solo utente (Edoardo) ma con login vero: nessun dato leggibile senza token. Niente chiavi segrete nel bundle.
4. **Livello dati.** Sostituire `claude.use("db")` con chiamate alla Data API (stile PostgREST). Tenere la stessa interfaccia interna (liste in memoria + funzioni di calcolo) per riusare viste e calcoli del prototipo. Gestire stati: caricamento, errore di rete, sessione scaduta, primo avvio vuoto.
5. **Import** di `data/seed.json`: creare il fondo, poi versamenti, poi TFR (mappando gli id `v-…` ai nuovi uuid), poi estratti conto, poi impostazioni. Controllo finale: totale TFR 2.659,15 €; versato 1.591,91 €; da versare 1.067,24 €; spese 15,00 €; ultimo valore 1.641,45 € al 03/11/2026.
6. **PWA.** `manifest.webmanifest` (nome "Piano pensione", short_name "Pensione", display standalone, theme/background #0e0e0d, icone di `icons/`), `apple-touch-icon`, meta `apple-mobile-web-app-*`, service worker che mette in cache la shell (dati sempre dalla rete, con messaggio chiaro se offline). Togliere dal prototipo il codice specifico dell'artefatto: `claude.use`, downloads, il controllo `isOwner`.
7. **Export** CSV/JSON come backup (download normale, ora che non c'è la sandbox).
8. **Verifica** su iPhone (Aggiungi a Home → si apre standalone con l'icona giusta) e desktop.

## Contesto utile

- Edoardo: PM e designer, ingegnere informatico, a suo agio con Git, SSH, terminale. Vuole scambi diretti e pratici.
- Origine dei dati: un Notion personale (pagina "Piano pensione", 5 database collegati). Non toccarlo: lo archivierà lui.
- Il fondo versa il TFR a trimestri, quindi tra busta paga e accredito passano settimane: è per questo che esiste lo stato "da versare".
