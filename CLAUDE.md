# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Vite dev server (port 5173)
npm run build        # type-check (vue-tsc) + Vite production build
npm run test:unit    # run all Vitest unit tests
npm run test:e2e     # run Playwright E2E tests (auto-starts dev server)
npm run lint         # oxlint + eslint with auto-fix
```

Run a single unit test file: `npx vitest run src/components/__tests__/CsvImport.spec.ts`

Run E2E tests headed (visible browser): `npm run test:e2e:headed`

## Project documentation

This is a single-page Vue 3 + TypeScript app for tracking Brazilian stock (ticker) data across multiple CSV imports. There is one route (`/`) rendered by `HomeView`. Detailed analysis lives in `.specs/codebase/` — load only what you need:

- [`.specs/codebase/STACK.md`](.specs/codebase/STACK.md) — tech stack, versions, dependency manifest.
- [`.specs/codebase/STRUCTURE.md`](.specs/codebase/STRUCTURE.md) — directory tree, where things live per capability.
- [`.specs/codebase/ARCHITECTURE.md`](.specs/codebase/ARCHITECTURE.md) — data-flow diagrams (CSV import, live-quote refresh, snapshot diff), identified patterns (snapshot history with selective change detection, live `cotacaoAtual` separated from immutable `TickerSnapshot`, derived metrics as pure functions, soft-delete via `status`, `configStore` survives data reset).
- [`.specs/codebase/CONVENTIONS.md`](.specs/codebase/CONVENTIONS.md) — naming, code organization, type safety (`noUncheckedIndexedAccess`), error handling (throw-at-boundary), comment style.
- [`.specs/codebase/TESTING.md`](.specs/codebase/TESTING.md) — Vitest + Playwright patterns, gate-check commands, test coverage matrix.
- [`.specs/codebase/INTEGRATIONS.md`](.specs/codebase/INTEGRATIONS.md) — brapi.dev client, `localStorage` persistence, CI.
- [`.specs/codebase/CONCERNS.md`](.specs/codebase/CONCERNS.md) — known tech debt, fragile areas, test gaps. Consult before modifying flagged components.

Feature specs (one per feature) live under `.specs/features/<feature>/` (`spec.md`, optional `tasks.md`, `validation.md`).

## Must-know guardrails

Repeated here because they are easy to regress and a quick reference saves a round-trip to the linked doc.

- **Do not reintroduce the `brapi` npm SDK.** `src/services/brapiClient.ts` uses plain `fetch`; the SDK adds `X-Stainless-*` headers that trip brapi.dev's CORS preflight. Token must stay in the query string, not a header. Rationale: [`INTEGRATIONS.md` § Stock Quote API](.specs/codebase/INTEGRATIONS.md#stock-quote-api).
- **PrimeFlex is NOT installed.** No utility classes (`flex`, `gap-2`, `align-items-center`). Write scoped CSS in `<style scoped>`; use `:deep()` to target PrimeVue-generated DOM. Rationale: [`STACK.md` § Frontend](.specs/codebase/STACK.md#frontend).
- **Manual live-quote refresh only — no polling.** [`INTEGRATIONS.md` § Background Jobs](.specs/codebase/INTEGRATIONS.md#background-jobs).
- **`configStore` is NOT reset with the data stores.** It holds user preferences (column visibility, sort/filter, brapi key, ticker filter) that must survive `Limpar dados`. Don't add `configStore.reset()` to `CsvImport.handleReset`. [`ARCHITECTURE.md` § configStore survives data reset](.specs/codebase/ARCHITECTURE.md#configstore-survives-data-reset).
- **`cotacaoAtual` lives on `Ticker`, NOT on `TickerSnapshot`.** Snapshots are immutable history; the current price is live. `TickerHistoryDialog` therefore shows snapshot fields only — it does NOT display `margemSeguranca` or `plProjetado` because those require `cotacaoAtual`. [`ARCHITECTURE.md` § Live price separated from historical snapshots](.specs/codebase/ARCHITECTURE.md#live-price-separated-from-historical-snapshots).

## Extending the stock table

Two task-oriented recipes that span multiple files. Keep these inline because they are the *how-to* for the most common changes to this codebase.

- **Adding a toggleable column**: append `{ field, header }` to `STOCK_TOGGLEABLE_COLUMNS` in `src/stores/configStore.ts` **and** add the corresponding `<Column v-if="configStore.isStockColumnVisible('field')">` in `src/components/StockDataTable.vue`. The two must stay in sync by `field`. Pinned columns (Código, Cotação, Preço Teto, Margem, Histórico) are intentionally NOT in that list and render unconditionally.
- **Adding a filterable column**: append `{ field, kind }` to `STOCK_FILTERABLE_COLUMNS` in `src/stores/configStore.ts` (`kind` = `'text' | 'numeric' | 'enum'`) **and** mark the `<Column filter ...>` in the template plus a `#filter` slot — `InputText` for text, `InputNumber` for numeric, `Select` for enum. PrimeVue 4 menu-mode filters render nothing without the slot, so it is mandatory. Filter constants come from `@primevue/core/api` (`FilterMatchMode`, `FilterOperator`).

## E2E gotchas worth surfacing

Two non-obvious patterns. Full E2E conventions are in [`TESTING.md` § E2E tests](.specs/codebase/TESTING.md#e2e-tests).

- **brapi mock body must be a string**: `route.fulfill({ body: JSON.stringify({ results: [...] }) })`. Passing an object literal silently breaks the response. The mock reads the ticker code from `route.request().url()` because the client hits the endpoint once per ticker.
- **Seeding the brapi key**: write `localStorage.config` via `page.addInitScript` BEFORE navigation. If the test also reloads mid-test (e.g., to verify persistence), use a conditional seed (`if (!localStorage.getItem('config')) ...`) so the script doesn't clobber state the test just persisted. Full patterns in `e2e/liveQuotes.spec.ts` and `e2e/tickerFilter.spec.ts`.
