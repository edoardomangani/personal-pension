// Borderless control that sits inside an inset row: the row draws the surface.
export const insetControlClass =
  'h-auto min-h-0 w-full rounded-none border-0 bg-transparent px-0 py-3 text-right text-foreground shadow-none focus-visible:outline-none aria-invalid:border-0'

// PasswordInput merges its own right padding first: repeat it so the eye button keeps its room.
export const insetPasswordClass = `${insetControlClass} pr-10 text-left`

// Shared row surface: a focused row hides its own divider and the next row's.
export const insetRowClass =
  'relative gap-0 transition-colors duration-200 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-[0.75px] not-first:before:bg-divider focus-within:bg-card focus-within:before:opacity-0 [:focus-within+&]:before:opacity-0'
