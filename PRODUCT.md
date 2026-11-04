# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Edoardo, product manager and designer with an engineering background, tracking his own Italian supplementary pension fund (fondo pensione aperto, Amundi Seconda Pensione). Uses it on phone and desktop: monthly after each payslip to log TFR, quarterly when the fund statement arrives, and occasionally on desktop to reason about the projection.

## Product Purpose
Replace a Notion setup (5 linked databases with rollups) with a personal tool that answers: how much is in the fund, how much went in, how it is performing, what is still in transit, how much IRPEF the personal contributions save, and where it lands at retirement (2061, born 1994, retirement at 67).

## Positioning
A private, single-user ledger: two record types only (movements and fund valuations), everything else derived. Honest numbers: IRR hidden until a year of history; TFR credited by the fund separately from payslip date.

## Operating Context
Monthly: payslip shows TFR → add movement (in transit). Quarterly: fund statement → add valuation, mark pending movements as credited. Yearly: personal contributions deductible up to 5.164,57 €, recovered in next year's tax return.

## Capabilities and Constraints
Single self-contained HTML artifact on claude.ai with its own database (owner-only read/write), CSV/JSON export. Data: 14 TFR movements, 3 valuations imported from Notion (Nov 2025 – Nov 2026). Multi-fund ready. Italian UI, euro, it-IT formats.

## Brand Commitments
Name "Next" (the app; the pension fund and its data keep their own names). User asked: dark theme preferred, precise and technical character, Phosphor icons. Must not feel like a bank (institutional blue, bureaucratic), must not be playful (emoji, gamification, candy colors), must move away from the previous green palette.

## Evidence on Hand
Real data only from the user's Notion. No projections presented as promises.

## Product Principles
- Plain-language numbers: every figure says what it means in one line.
- Derive, don't ask: the user records facts, the app computes aggregates.
- Honest uncertainty: estimates are labeled as such.
- Fast entry on phone: adding a payslip TFR takes seconds.
