# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
People tracking their own Italian supplementary pension fund (fondo pensione aperto). Edoardo is the first user: product manager and designer with an engineering background, on Amundi Seconda Pensione. Registration is open and every user has their own separate plan. Used on phone and desktop: monthly after each payslip to log TFR and contributions, quarterly when the fund statement arrives, and occasionally on desktop to reason about the projection.

## Product Purpose
Replace a Notion setup (5 linked databases with rollups) with a personal tool that answers: how much is in the fund, how much went in, how it is performing, what TFR is still waiting to be paid in, how much IRPEF the personal and employer contributions save, and where it lands at retirement.

## Positioning
A private ledger per user: the user records facts (payslips, movements, fund statements), everything else is derived. Honest numbers: IRR hidden until a year of history; TFR stays "da versare" until the fund actually receives it.

## Operating Context
Monthly: payslip with TFR, employer and personal lines → add a payslip; its TFR is "da versare". Quarterly: the fund pays in → add a movement with TFR, employer, personal, voluntary and fee lines, linking the payslips it covers; fund statement → add its value. Yearly: personal and employer contributions deductible up to 5.164,57 €, recovered in next year's tax return.

## Capabilities and Constraints
Static PWA on GitHub Pages (Vue 3, Vite, TypeScript), data on Neon: Neon Auth for login, Data API, row-level security so each user reads and writes only their own plan. No server to maintain, no secrets in the bundle. Data model: payslips with TFR/Datore/Personale lines; movements with TFR/Datore/Personale/Volontario/Spesa lines; fund statements; a payslip's TFR is "da versare" until the payslip is linked to a movement. Multi-fund ready. Italian UI, euro, it-IT formats.

## Brand Commitments
Name "Next" (the app; the pension fund and its data keep their own names). Dark theme only, precise and technical character, Phosphor icons. Must not feel like a bank (institutional blue, bureaucratic), must not be playful (emoji, gamification, candy colors). Estimates are always declared as estimates.

## Evidence on Hand
Real data imported from the user's Notion. No projections presented as promises.

## Product Principles
- Plain-language numbers: every figure says what it means in one line.
- Derive, don't ask: the user records facts, the app computes aggregates.
- Honest uncertainty: estimates are labeled as such.
- Fast entry on phone: adding a payslip takes seconds.
