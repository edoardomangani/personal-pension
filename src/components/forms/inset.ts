// Controllo senza bordo dentro una riga inset: la superficie la disegna la riga.
export const insetControlClass =
  'h-auto min-h-0 w-full rounded-none border-0 bg-transparent px-0 py-3 text-right text-foreground shadow-none focus-visible:outline-none aria-invalid:border-0'

// PasswordInput unisce prima il proprio padding destro: lo ripetiamo perché il pulsante dell'occhio tenga il suo spazio.
export const insetPasswordClass = `${insetControlClass} pr-10 text-left`

// Superficie comune delle righe: la riga col focus nasconde il proprio divisore e quello della riga dopo.
export const insetRowClass =
  'relative gap-0 transition-colors duration-200 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-[0.75px] not-first:before:bg-divider focus-within:bg-card focus-within:before:opacity-0 [:focus-within+&]:before:opacity-0'

// Card di vetro dei gruppi a righe, condivisa da moduli, liste di scelta e «Profilo».
export const insetGroupClass =
  'overflow-hidden rounded-[24px] border-[0.75px] border-border bg-card shadow-glass lg:rounded-3xl'
