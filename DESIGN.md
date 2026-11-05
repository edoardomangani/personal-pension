---
name: Next
description: Il fondo pensione su vetro scuro e calmo, lime solo sulle cifre che crescono e sugli anni della proiezione.
colors:
  background: "#060708"
  foreground: "#f3f5f2"
  muted-foreground: "#b4b8b5"
  subtle-foreground: "#9a9f9b"
  primary: "#f3f5f2"
  primary-foreground: "#060708"
  card: "rgba(255, 255, 255, 0.06)"
  secondary: "rgba(255, 255, 255, 0.09)"
  accent: "rgba(255, 255, 255, 0.09)"
  muted: "rgba(255, 255, 255, 0.06)"
  popover: "rgba(20, 21, 23, 0.92)"
  border: "rgba(255, 255, 255, 0.08)"
  border-strong: "rgba(255, 255, 255, 0.12)"
  input: "rgba(255, 255, 255, 0.08)"
  divider: "rgba(255, 255, 255, 0.07)"
  divider-row: "rgba(255, 255, 255, 0.05)"
  header: "rgba(6, 7, 8, 0.55)"
  bar: "rgba(6, 7, 8, 0.72)"
  sidebar: "rgba(6, 7, 8, 0.4)"
  sidebar-accent: "rgba(255, 255, 255, 0.08)"
  sidebar-hover: "rgba(255, 255, 255, 0.05)"
  overlay: "rgba(0, 0, 0, 0.5)"
  brand: "#d4f53c"
  brand-foreground: "#0c1203"
  brand-soft: "rgba(212, 245, 60, 0.16)"
  income: "#d4f53c"
  ring: "#f3f5f2"
  ambient-strong: "rgba(212, 245, 60, 0.15)"
  ambient-soft: "rgba(212, 245, 60, 0.06)"
  destructive: "#ff7a6b"
  warning: "#ffc457"
typography:
  balance:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  balance-decimals:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  balance-lg:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "76px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  balance-lg-decimals:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  section:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  amount:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
    fontFeature: "tnum"
  meta:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.33
  tab-label:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
  avatar-lg:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  tile: "12px"
  2xl: "18px"
  3xl: "22px"
  card-mobile: "24px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  button-sm:
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 12px"
  button-lg:
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 20px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  button-ghost-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
  button-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    size: "48px"
  button-new-movement:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px 0 14px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "22px"
    padding: "0 9px"
  badge-icon:
    iconSize: "12px"
    gap: "4px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    width: "232px"
  sidebar-item:
    textColor: "{colors.subtle-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 12px"
  sidebar-item-hover:
    backgroundColor: "{colors.sidebar-hover}"
    textColor: "{colors.foreground}"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.foreground}"
  tab-item:
    textColor: "{colors.subtle-foreground}"
    typography: "{typography.tab-label}"
    height: "56px"
  tab-item-active:
    textColor: "{colors.foreground}"
  bottom-bar:
    backgroundColor: "{colors.bar}"
    height: "84px"
  header-mobile:
    backgroundColor: "{colors.header}"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    width: "480px"
---

# Design System: Next

## Overview

**Creative North Star: "La cassaforte di vetro"**

Next segue un fondo pensione: quanto è stato versato, quanto è cresciuto, quanto TFR aspetta di arrivare sul fondo e dove può portare da qui alla pensione. Il fondo è quasi nero, i numeri stanno dietro superfici di vetro sottili e tutto è calmo: niente compete con il valore della posizione. Il colore è un segnale, non una decorazione: il lime acido si accende solo sulle cifre positive (crescita, versato, rendimento) e sugli anni della proiezione. Le azioni sono bianche: il «+», «Registra», i bottoni principali, l'anello del focus. Se il lime compare altrove, perde il suo significato.

È lo stesso design system di Wallet, per intero: un solo stile per le due app. È un'interfaccia da usare, non da guardare: la precisione conta più dell'espressione. Il carattere sta nei dettagli (il valore grande in Bricolage, i fili di luce sul vetro, il bagliore lime appena percepibile dietro la pagina). Gli stessi componenti e le stesse misure su desktop e su telefono, che è lo strumento di tutti i giorni; il tocco ha sempre un'area di almeno 44px.

Sentimento dei componenti: precisi e silenziosi. Pill da 36px, bordi da un filo, nessun effetto oltre al vetro e a una lieve pressione: si fanno notare solo quando servono.

**Key Characteristics:**
- Un solo tema, scuro; nessun selettore di tema.
- Vetro a tre gradini fissi sopra un fondo quasi nero, con bagliore lime al massimo al 15%.
- Testi in tre colori pieni, mai trasparenti.
- Una sola famiglia (Bricolage Grotesque) in file statici e cifre tabulari ovunque.
- Controlli a pillola, icone Phosphor in tre pesi con un ruolo ciascuno: Regular ovunque, Fill per la voce di navigazione attiva, Bold solo per il «+».

## Colors

Un nero caldo appena verdognolo, bianchi velati per il vetro, il bianco per agire e un unico accento acido per i numeri che crescono.

### Primary
- **Lime Acido** (`brand`, `income`, #D4F53C): le cifre positive (la crescita «+49,54 €», il versato 1.591,91 €, il rendimento annuo, un versamento arrivato sul fondo «+534,95 €») e gli anni della proiezione (la linea tratteggiata dopo oggi). Più il bagliore di fondo (`ambient-strong` 0,15, `ambient-soft` 0,06) e il tile di crescita e versamenti (**Lime Velato** `brand-soft`). Il testo sopra il lime pieno è **Lime Notte** (`brand-foreground`), quasi nero. Campioni: `ACC-income-amount`, `ACC-income-tile`, `ACC-forecast`, `ACC-future-line`.
- **Bianco Gesso** (`primary`, `ring`): le azioni. Il «+» della barra, «Registra» nella barra in alto su desktop, il bottone principale delle schermate (testo `primary-foreground`) e l'anello del focus (`ACC-action`, `ACC-focus-ring`).

### Neutral
- **Nero Cassaforte** (`background`): il fondo di ogni pagina, sempre con il bagliore sopra.
- **Bianco Gesso** (`foreground`): testo principale e spese (−15,00 €).
- **Grigio Salvia** (`muted-foreground`): testo secondario, voci di sidebar a riposo.
- **Grigio Nebbia** (`subtle-foreground`): meta, etichette, placeholder, il TFR da versare in una riga (`ACC-transfer-amount`).
- **Vetro 1** (`card`, `muted`, 6%), **Vetro 2** (`secondary`, `accent`, 9%), **Vetro 3** (`border-strong`, 12%): gli unici tre gradini di trasparenza.
- **Filo** (`border`, `input`), **Divisore** (`divider` tra zone della pagina), **Divisore di riga** (`divider-row` tra righe).
- **Lastra scura** (`popover`, `header`, `sidebar`, `overlay`): superfici che scorrono sopra il contenuto.

### Tertiary
- **Corallo** (`destructive`): solo errori ed eliminazioni, sempre con una parola.
- **Ambra** (`warning`): avvisi, sempre con una parola.

### Named Rules
**The Rare Lime Rule.** Il lime ha due ruoli e basta: cifre positive (crescita, versato, rendimento, versamenti arrivati) e anni della proiezione. Mai su azioni, focus, badge, titoli, spese, TFR da versare o decorazioni: è raro, quindi quando appare significa qualcosa.

**The White Acts Rule.** Ciò che si preme è bianco: il «+», «Registra», i bottoni principali, l'anello del focus (2px pieno `ring`, staccato di 2px). Il bianco non indica mai una cifra positiva.

**The Spending Isn't Red Rule.** Le spese sono `foreground` e il TFR da versare `subtle-foreground`, né rossi né ambra. Il corallo è per errori ed eliminazioni, non per i costi del piano.

**The Three Inks Rule.** I testi sono `foreground`, `muted-foreground` o `subtle-foreground`, colori pieni. Niente altri grigi, niente testo con opacità.

**The Ambient Ceiling Rule.** `ambient-strong` non supera 0,15 e `ambient-soft` 0,06, i valori delle maquette definitive di Wallet: oltre, il testo secondario sul vetro sopra il bagliore perde contrasto.

## Typography

**Display Font:** Bricolage Grotesque (con system-ui, sans-serif)
**Body Font:** Bricolage Grotesque (con system-ui, sans-serif)

**Character:** una sola grottesca, Bricolage Grotesque in file statici 400/500/600 nel bundle, senza asse ottico. Cifre tabulari (`tabular-nums`) su tutto il body. Nessuna richiesta esterna.

### Hierarchy
La scala è quella standard di Tailwind, uguale su telefono e desktop: nessuna misura cambia col breakpoint. Peso, interlinea e spaziatura si aggiungono come utility normali solo dove contano.
- **Balance** (`text-balance-md`, 56px in 600, −0,04em; `text-balance-lg` 76px su desktop): il valore della posizione (1.641,45 €); decimali e simbolo in `text-balance-md-decimals` (26px) o `text-balance-lg-decimals` (32px) in `subtle-foreground` (`AMT-balance-mobile`, `AMT-balance-desktop`).
- **Display** (`text-2xl`, 24px, 500, interlinea 1,15, −0,02em): frase di testata, una per schermata.
- **Title** (`text-xl`, 20px, 600, −0,015em): titolo di schermata, della barra in alto e della testata principale su telefono; **Figure** (`text-xl`, 600, −0,03em, interlinea 1,1) per una cifra di riepilogo come il versato (`AMT-account`).
- **Section** (`text-lg`, 18px, 600, −0,01em): titolo di sezione della Home.
- **Heading** (`text-base`, 16px, 600): titolo di card, di sheet e della testata secondaria su telefono.
- **Body** (`text-sm`, 14px, 400): testo corrente; il nome di un movimento in 500.
- **Amount** (`text-sm font-semibold`): importo di riga, allineato a destra, segno − (U+2212) per le spese e + per le cifre positive (`AMT-row-expense`, `AMT-row-income`).
- **Meta** (`text-xs`, 12px, 400): la riga sotto il nome, totali del giorno, aiuti.
- **Label** (`text-xs font-semibold`): etichette di sezione, badge, intestazioni di tabella.
- **Tab label** (`text-tab-label`, 10px in 600, interlinea 1): solo le etichette della barra in basso su telefono.
- **Avatar grande** (`text-avatar-lg`, 40px in 600, interlinea 1): solo le iniziali nell'anteprima da 160px di «Foto del profilo».
- **Campi di testo:** `text-base` sotto `md` e `md:text-sm` da `md`, l'unica misura che cambia: sotto i 16px iOS ingrandisce la pagina al focus.

### Utilities
Le sole misure con nome in `app.css` sono quelle che la scala di Tailwind non ha: `text-balance-md`, `text-balance-md-decimals`, `text-balance-lg`, `text-balance-lg-decimals`, `text-tab-label` e `text-avatar-lg`. Il valore è `balance-md` e non `balance` perché `text-balance` è già l'utility di Tailwind per `text-wrap: balance`. Mai misure arbitrarie `text-[Npx]`.

### Named Rules
**The Three Weights Rule.** 400 per il testo, 500 per nomi di movimento e voci di menu, 600 per titoli, importi e voci attive. Mai 700.

**The 12px Floor Rule.** Nessun testo sotto i 12px, con una sola eccezione voluta: le etichette della barra in basso a 10px (`tab-label`); stanno sotto un'icona da 24px che le rende leggibili. Lettere strette solo dai 18px in su, mai oltre −0,04em.

## Layout

Il confine fra telefono e desktop è `lg` (1024px): sotto, testata e barra in basso; da `lg`, sidebar e barra in alto. Telefono: testata sticky di vetro, contenuto a scorrimento sotto il bagliore con padding 12px 16px (sopra e ai lati), 36px tra sezioni, barra in basso ancorata a tutta larghezza (84px circa) con il «+» al centro. Desktop: sidebar fissa a sinistra (232px, non riducibile) col piede utente in fondo, barra in alto sticky con il titolo della schermata e «Registra» dove serve, contenuto con padding 24px 48px 48px e 32px tra sezioni. Il padding sta nella shell, non nelle viste; il limite di 1180px vale per il contenuto dentro il padding.

Installata dalla Home (standalone) l'app va sotto la barra di stato: `viewport-fit=cover` e barra di stato trasparente, così sopra la testata si vede il suo stesso vetro, senza strisce di altro colore. La testata aggiunge in alto la safe area (`calc(12px + env(safe-area-inset-top))`, 59px su un iPhone con 47 di inset), la barra in basso la tiene in fondo (`max(24px, env(safe-area-inset-bottom))`) e il contenuto finisce sopra la barra più l'inset. Nessuna safe area ai lati.

Controlli alti uguali su telefono e desktop (36px di norma, vedi Buttons); cambiano solo le righe delle liste (52px su desktop, 56px su telefono). L'area di tocco è sempre almeno 44px. Spaziatura su una scala da 4px (4, 8, 10, 12, 16, 20, 24, 32).

## Elevation & Depth

La profondità è vetro, non ombra. Le superfici sono strati di bianco velato sopra il nero, ognuno con un bordo da 0,75px e un filo di luce interno in basso. Le ombre vere esistono solo per ciò che galleggia (popover, dialog, menu). Il blur appare solo dove il vetro scorre sopra altro contenuto: testata, barra in basso, pannelli, dialog. Testata e barra in basso non hanno bordo: il vetro sfuma nel contenuto con una maschera di 24px (`glass-header`, `glass-bar`).

### Shadow Vocabulary
- **Filo di luce** (`box-shadow: inset 0 -1px 2px rgba(255, 255, 255, 0.06)`): ogni superficie di vetro (card, input, bottone outline).
- **Galleggiante** (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5)`): popover, dialog, menu.
- **Ritaglio** (`box-shadow: 0 0 0 3px var(--background)`): stacca un elemento sovrapposto (il pallino di oggi sulla linea della proiezione, un avatar) dal fondo.

### Named Rules
**The Text-Off-Glass-3 Rule.** Il testo sta solo su vetro 1 o 2, mai sopra vetro 3.

**The Blur-Where-It-Scrolls Rule.** Blur 20px con saturazione 140% su testata e barra in basso, 24px sui pannelli, 30px su popover e dialog; altrove niente.

## Shapes

I controlli sono pill: bottoni, input, badge, segmenti. Il resto cresce col contenitore: 6px per piccoli contenitori; i tile con icona in proporzione alla misura, 12px (`rounded-tile`, `--radius-tile`) per i tile da 36px (`size-9`: righe su telefono, «Profilo», tile della crescita) e 10px (`rounded-lg`, la base `--radius`) per quelli da 32px (`size-8`: righe su desktop); 10px anche per voci di menu e sidebar, 14px per tabelle e tooltip ricchi, 18px per i dialog, 22px per le card su desktop e lo Sheet dal basso, 24px (`rounded-card-mobile`, `--radius-card-mobile`) per le card su telefono. Bordi sempre da un filo (0,75px).

## Components

### Buttons
- **Shape:** pill (999px), testo in 600. Tre altezze, uguali su telefono e desktop: la misura dipende dal contesto, non dal dispositivo.
- **36px (`default`, `icon`):** ogni bottone normale e ogni bottone a icona: la X degli sheet, «Registra» nella barra in alto. Testo `text-sm`, padding 16px.
- **32px (`sm`, `icon-sm`):** solo nei contesti densi: righe, card. Testo `text-xs`, padding 12px.
- **40px (`lg`, `icon-lg`):** solo la CTA principale a tutta larghezza in fondo a uno sheet o a un modulo e la CTA degli stati vuoti. Testo `text-sm`, padding 20px.
- **48px:** solo il «+» della barra in basso.
- **Area di tocco:** sui dispositivi touch i bottoni da 32 e 36px hanno un'area invisibile da 44px (utility `touch-target`, uno `::before` centrato), senza cambiare l'aspetto; si usa dove non si sovrappone ai vicini.
- **Primary:** Bianco Gesso con testo Nero Cassaforte; hover al 90%.
- **Outline:** vetro 1 con filo e filo di luce; hover su vetro 2.
- **Ghost:** testo Grigio Salvia, hover su vetro 2 con testo Bianco Gesso.
- **Destructive:** corallo con testo scuro, solo per eliminare.
- **«Continua con Google» (`BTN-outline-md-google`):** outline 36 a tutta larghezza, col logo di Google nei suoi quattro colori a 16px prima del testo; con l'invio in corso lo spinner al posto del logo. Solo nelle pagine di accesso, sopra il separatore «oppure con la tua email». È l'unica eccezione approvata alle icone Phosphor e ai colori dei token.
- **Separatore «oppure con la tua email» (`SEP-label`):** nelle pagine di accesso, fra «Continua con Google» e i campi. Due tratti `divider` ai lati dell'etichetta (`text-sm`, `muted-foreground`), 12px di spazio fra tratto ed etichetta, nessun fondo sotto l'etichetta (si vede il bagliore); alto 24px, con la linea a ~36px dal pulsante sopra e dal gruppo dei campi sotto. Senza etichetta è una linea sola.
- **Press / Focus:** transizioni di colore 0,2s; alla pressione `scale(.97)` in 0,15s con `cubic-bezier(.2,.8,.2,1)`; focus con anello bianco pieno da 2px staccato di 2px (`outline`, non `box-shadow`, così non si somma al filo di luce). Rispettano `prefers-reduced-motion`.
- **Il «+»:** bianco, tondo da 48px al centro della barra in basso su telefono, icona Plus Bold scura, ombra `0 8px 24px rgba(0, 0, 0, 0.45)` (`BTN-new-movement-mobile`). Su desktop è la pillola bianca «Registra» (36px, padding 0 16px 0 14px, Plus Bold 16px) a destra nella barra in alto, solo in Home, Movimenti e Valori (`BTN-new-movement-desktop`).

### Badges
- **Style:** pill alta 22px, label 12px in 600. Default su vetro 2; `outline` con filo su vetro 3; `destructive` e `warning` solo come contorno e testo colorato, mai pieni.
- **Badge con icona:** icona Phosphor da 12px prima del testo, a 4px (il `Badge` lo prevede già), per uno stato come «Da versare».

### Avvisi
- **Default (`ALR-default`):** vetro, testo e icona nel colore del testo; padding 12px 16px, titolo 14px, descrizione 14px in `muted-foreground`. Per un'informazione neutra.
- **Destructive (`ALR-destructive`):** velo corallo, icona corallo. Solo per un errore.
- **Offline (`ALR-offline`):** il default con `PhWifiSlash`, titolo «Sei offline» in 500 e descrizione «I dati si aggiornano quando torna la rete.»; ruolo `status` (annuncio cortese), non `alert`. Si vede solo senza rete, in ogni pagina della shell e in nessuna fuori (accesso, onboarding). Sul telefono sta dentro la testata sticky, 12px sotto la riga del titolo, e resta visibile scorrendo; da `lg` è la prima cosa del contenuto, sotto la barra in alto, largo quanto il contenuto e con 32px sotto. Un solo avviso alla volta: offline c'è solo il banner, anche se la vista non ha i dati.
- **Errore di caricamento (`ALR-errore-caricamento`):** il destructive con `PhWarningCircle`, titolo «Non riesco a caricare i dati» in 500 e descrizione «Controlla la connessione e riprova.»; Riprova (`outline` `sm` con `PhArrowClockwise` 16) in linea a destra del testo, a 12px, centrato in verticale, mentre l'icona d'errore resta in alto; sul telefono il testo va a capo e il bottone non si stringe. Sta dove sta il banner su desktop (prima cosa del contenuto, largo quanto il contenuto, 32px sotto) e sul telefono è la prima cosa del contenuto, 12px sotto la testata. Si vede solo online, mai insieme al banner; durante il caricamento lanciato da Riprova il bottone è spento e l'avviso resta finché il caricamento non finisce.
- **Warning (`ALR-warning`):** fondo del default, icona ambra (`[&>svg]:text-warning` sull'`Alert`), titolo su più righe senza puntini (`line-clamp-none` sull'`AlertTitle`), icona Phosphor come primo figlio. Per uno stato che va notato ma non è un errore («Sei buste paga hanno il TFR ancora da versare»), sempre con un titolo esplicito.

### Cards / Containers
- **Corner Style:** 22px su desktop, 24px su telefono.
- **Background:** vetro 1 con bordo da un filo e filo di luce.
- **Internal Padding:** 16px in densità compatta.
- **Liste di movimenti (`MOV-list-desktop`, `MOV-list-mobile`):** una card di vetro per giorno; l'etichetta del giorno (`text-xs`, 600, `muted-foreground`, «09/07/2026») e il totale del giorno (`text-xs`, `subtle-foreground`) stanno fuori, sopra la card, con 4px di rientro. Righe da 52px su desktop e 56px su telefono, tile icona 32/36px con raggio 10/12px. Tre aspetti di riga: versamento arrivato sul fondo (tile Lime Velato, cifra lime «+534,95 €»), spesa (tile vetro 2, cifra bianca «−15,00 €»), busta paga con il TFR da versare (tile trasparente con un filo, testo e cifra in Grigio Nebbia, meta «Da versare»).

### Inputs / Fields
- **Style:** pill alta 36px come i bottoni, vetro 1, filo `input`, testo `text-base` sotto `md` e `md:text-sm` da `md` (niente zoom di iOS al focus), placeholder Grigio Nebbia.
- **Focus:** anello bianco da 2px staccato di 2px, come ogni altro controllo.
- **Error / Disabled:** bordo e anello corallo con `aria-invalid`; disabilitato al 50%.

### Forms (inset, come le impostazioni di iOS)
- **Gruppo:** una card di vetro come quelle dei giorni nelle liste di movimenti (raggio 24px su telefono, 22px su desktop, larga al massimo 560px). Il titolo del gruppo sta fuori, sopra (`text-xs` 600, `muted-foreground`); l'aiuto fuori, sotto (`text-xs`, `subtle-foreground`). Componenti `InsetGroup` e `InsetRow` in `components/forms/`, sopra la famiglia Field di shadcn-vue (`FRM-rows-desktop`, `FRM-rows-mobile`).
- **Riga:** alta almeno 48px, etichetta `text-sm` a sinistra, valore allineato a destra in un campo senza bordo; un filo da 0,75px separa le righe, rientrato di 16px. Un tocco ovunque sulla riga raggiunge il controllo; con il focus la riga si schiarisce di un gradino di vetro.
- **Tipi:** testo e numero con il campo a destra (data sul fondo, importo TFR); scelta con valore e freccia (`PhCaretRight`) che apre il `ResponsiveSheet` con l'elenco (e una ricerca sopra i 12 elementi), come la busta paga da collegare; importo volontario come riga con importo, come l'importo TFR; interruttore con lo `Switch` a destra per un sì/no («Registrane un altro»); data con il valore a destra.
- **Errori:** etichetta corallo e messaggio sotto la riga, dentro la card, senza spostare etichetta e valore.
- **Eccezioni:** il testo lungo (nota) è una riga a tutta larghezza più alta con l'etichetta come segnaposto; email e password dell'accesso sono righe senza etichetta visibile con il segnaposto, nella stessa card, e il nome resta per i lettori di schermo.
- **Invio:** la CTA in fondo al modulo è un bottone `lg` a tutta larghezza.
- **Pagina di accesso:** nessuna card esterna, il gruppo inset è l'unica superficie di vetro.
- **Scelta da un elenco lungo:** lo sheet si apre sulla voce selezionata, evidenziata e con la spunta; la ricerca resta in cima mentre l'elenco scorre.

### Navigation
Icone delle sezioni, uguali in sidebar, barra in basso e «Profilo» (Regular a riposo, Fill sulla voce attiva): Home `PhSquaresFour`, Movimenti `PhCoins`, Valori `PhPiggyBank`, Futuro `PhMountains`, Fisco `PhCalculator`, Impostazioni `PhSlidersHorizontal`.
- **Sidebar (desktop):** larga 232px, padding 16px 12px, `sidebar` con un filo a destra. In alto il marchio, in una riga alta 32px con padding 0 4px: il segno di Next (pillola e punto in orizzontale, pieno, `foreground`) da 24px, 10px di spazio e «Next» in `text-lg` 600 con lettere strette di −0,02em, `foreground`; subito sotto le voci: Home, Movimenti, Valori, Futuro, Fisco, Impostazioni. «Registra» non sta in sidebar. Voci alte 40px, raggio 10px, padding 0 12px, 2px fra l'una e l'altra, icona 20px e 12px fra icona ed etichetta, 14px in 400, Grigio Nebbia. Hover su `sidebar-hover` (5%) con testo Bianco Gesso; la voce attiva su `sidebar-accent` (8%), icona Fill, testo Bianco Gesso in 600 e una pillola bianca 3×16px centrata sul bordo sinistro (raggio 0 2px 2px 0): è l'unica barra laterale ammessa, bianca e mai colorata. Una voce è accesa solo sulla sua rotta: su «Profilo» e Account nessuna.
- **Piede della sidebar (desktop):** in fondo, una riga semplice a tutta larghezza alta 48px, senza fondo né bordo a riposo: hover su `sidebar-hover` (5%) come le voci, `sidebar-accent` (8%) finché il menu è aperto. Avatar da 32px (`AvatarUtente`: la foto dell'utente se c'è, altrimenti le iniziali) e 10px fino al nome in 14px 500 ed email in `text-xs` `subtle-foreground` (solo l'email se manca il nome, «Account» senza sessione), `PhCaretUpDown` 16px a destra. Apre sopra di sé un `DropdownMenu` largo quanto il piede (raggio 14px, padding 4px): in testa nome ed email, un separatore, poi Account (`PhUser`, verso la pagina Account) ed Esci (`PhSignOut`), voci alte 32px con icona 16px. Si chiude con Esc, clic fuori o scelta di una voce.
- **Barra in alto (desktop):** sticky, alta 64px, `glass-header`, padding 0 48px. Il titolo della schermata a sinistra (Title, anche in Home: «Home», non il saluto); a destra la pillola «Registra» solo in Home, Movimenti e Valori, o l'azione della pagina (es. «Salva» in Account, 36px, padding 0 16px) preceduta, con modifiche non salvate, da «Modifiche non salvate» in `text-xs` `warning` col pallino da 6px. Nessuna freccia indietro su desktop.
- **Testata principale (telefono):** in Home, Movimenti, Valori e Futuro. Sticky, `glass-header` (lastra al 55%, blur 20px, saturazione 140%, sfumatura di 24px verso il contenuto), padding in alto `calc(12px + env(safe-area-inset-top))`, in basso 12px, ai lati 16px. A sinistra il titolo (Title, una riga con i puntini), a destra l'avatar da 36px (la foto se c'è, altrimenti cerchio di vetro con le iniziali in 12px 600) che porta a «Profilo», su una riga alta almeno 44px. In Home il titolo è il saluto («Ciao Edoardo», «Ciao» senza nome) e sotto, a 2px, la data di oggi in Meta `subtle-foreground` («mercoledì 4 novembre»); la testata ha la stessa altezza con e senza data. Offline, 12px sotto la riga del titolo, il banner `ALR-offline`, che allunga la testata.
- **Testata secondaria (telefono):** in «Profilo», Account, Fisco e Impostazioni. A sinistra un cerchio di vetro da 36px con `PhCaretLeft` 18px («Indietro»), al centro il titolo in Heading, a destra uno spazio vuoto largo quanto il pulsante, o l'azione della pagina (es. «Salva» in Account): bottone primario da 32px (padding 0 12px), spento al 50% senza modifiche, con le modifiche non salvate un pallino `warning` da 6px prima e il testo «Modifiche non salvate» solo per i lettori di schermo (`role="status"`); i due lati crescono uguali, così il titolo resta al centro; niente avatar. Offline il banner `ALR-offline` sta 12px sotto la riga del titolo, come nella principale. La freccia torna alla pagina precedente dell'app, o alla madre se si è entrati dall'indirizzo («Profilo» → Home; Account, Fisco, Impostazioni → «Profilo»).
- **Barra in basso (telefono):** ancorata a tutta larghezza, non una pillola sospesa; `glass-bar` (dal 72% in basso al 55% in alto, blur 20px, saturazione 140%, sfumatura di 24px verso il contenuto), senza bordo. Quattro voci (Home, Movimenti, Valori, Futuro) e il «+» da 48px al centro; Fisco e Impostazioni si raggiungono da «Profilo». C'è in ogni pagina sotto `lg`, anche in quelle secondarie, dove nessuna voce è accesa. Voce: icona 24px, 6px di spazio, etichetta `tab-label`; attiva con icona Fill e testo Bianco Gesso, senza sfondo; a riposo icona Regular in Grigio Nebbia. Padding in basso `max(24px, env(safe-area-inset-bottom))`, altezza totale circa 84px.
- **Pagina «Profilo»:** si apre dall'avatar della testata. In testa, centrati, l'avatar da 80px (la foto, o il vetro con le iniziali 24px 600) col pulsante «Cambia foto» sovrapposto in basso a destra (cerchio 32px `foreground` con `PhCamera` 16px, bordo 2px `background`), attivo: apre «Foto del profilo»; sotto il nome in `text-lg` 600 e l'email in Meta `subtle-foreground`. Poi un gruppo di vetro (raggio 24px) con Account, Impostazioni e Fisco, righe alte 56px con tile da 36px e `PhCaretRight` a destra; a 24px un gruppo a parte con la sola riga Esci (`PhSignOut`, senza freccia). Su desktop la stessa pagina, aperta solo dall'indirizzo.
- **Voci non ancora pronte:** il «+» e «Registra» stanno già al loro posto ma sono disattivati (`aria-disabled`); il «+» della barra in basso e «Registra» della barra in alto restano bianchi pieni anche disattivati, perché sono il punto di richiamo della barra (The White Acts Rule). Sono raggiungibili da tastiera e con hover, focus e tocco mostrano il suggerimento «In arrivo» (`ComingSoonTooltip`); aperto al tocco, si richiude da solo dopo circa 2 secondi.

### Dialog / Popover
- Lastra scura al 92% con bordo `border-strong`, ombra galleggiante, blur 30px; raggio 18px per i dialog.
- **Pannello dal basso (telefono):** la stessa lastra (`sheet-surface`) aperta in basso, raggio 24px in alto, maniglia centrata 40×4px al 18% di bianco, overlay `overlay`, padding in basso `max(24px, env(safe-area-inset-bottom))`. Testata: bottone tondo di vetro da 36px con la X a sinistra, titolo centrato (`text-base` in 600), azione facoltativa a destra («Salva»). Da `lg` lo stesso contenuto apre il dialog (`ResponsiveSheet`).
- **Foto del profilo (`FotoProfiloSheet`):** pannello dal basso o dialog col titolo «Foto del profilo». Al centro l'anteprima tonda da 160px (`AvatarUtente`: la foto, o le iniziali in `text-avatar-lg`), sotto a 24px il testo in `text-sm` `muted-foreground` centrato. Comandi da 40px: «Scegli una foto» (primario con `PhImage`) e, solo con una foto, «Rimuovi la foto» (`ghost` corallo con `PhTrash`); dopo la scelta l'anteprima mostra la nuova, «Usa questa foto» (primario) e «Scegline un'altra» (`secondary`). Telefono: impilati a tutta larghezza, il principale sopra; dialog: in riga a destra, il principale per ultimo. Spinner sul comando in corso e comandi spenti durante l'invio; file non validi o salvataggio non riuscito in un avviso `destructive` sopra i comandi. Nel pannello di Account «Cambia foto» (outline 36px) apre lo stesso dialog.
- **Dialog (da `lg`):** ancorato in alto: bordo superiore a 160px dalla cima della finestra, centrato in orizzontale, senza traslazione verticale; altezza massima la finestra meno 160px meno 24px in basso (`--dialog-max-height`), oltre scorre il corpo e il piede resta visibile. Sotto `lg` un dialog resta centrato nella finestra. Largo 480px, padding 16px 20px 20px. Testata alta 44px con il titolo a sinistra (`text-base` in 600), poi l'azione facoltativa e la ✕ di vetro da 36px a destra: vale per tutti i dialog dell'app, anche quelli di conferma; il pannello dal basso su telefono resta com'è.
- **Toast:** la lastra dei popover con raggio 14px. Sotto `lg` 16px ai lati e 104px dal fondo della finestra (`--bottom-bar-height` + 20px), sopra la barra in basso; da `lg` largo 320px, 24px da destra e dal fondo. Più toast si impilano dalla stessa posizione.

## Do's and Don'ts

### Do:
- **Do** mettere il bagliore (`radial-gradient(900px 620px at 96% -12%, ambient-strong…)` e `radial-gradient(760px 620px at -6% 70%, ambient-soft…)`) dietro ogni pagina, fisso mentre il contenuto scorre.
- **Do** usare `accent` per hover e voce attiva; nella sidebar `sidebar-hover` e `sidebar-accent`.
- **Do** allineare a destra gli importi con cifre tabulari, formato `1.641,45 €`.
- **Do** usare icone Phosphor nel colore del testo: Regular ovunque, Fill solo per la voce di navigazione attiva, Bold solo per il «+»; 16–20px su desktop, 20–24px su telefono.
- **Do** accompagnare corallo e ambra sempre con una parola.
- **Do** etichettare la proiezione come stima, anche quando è in lime.

### Don't:
- **Don't** usare il lime fuori da cifre positive, proiezione, bagliore e tile di crescita e versamenti: niente lime su azioni o focus.
- **Don't** colorare di rosso le spese o di ambra il TFR da versare.
- **Don't** introdurre trasparenze oltre i tre gradini di vetro, né testo trasparente.
- **Don't** usare il peso 700 o testo sotto i 12px (salvo le etichette della barra in basso).
- **Don't** aggiungere un tema chiaro o un selettore di tema.
- **Don't** mettere blur su superfici che non scorrono sopra altro contenuto.
