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

Run a single unit test file:
```bash
npx vitest run src/components/__tests__/CsvImport.spec.ts
```

Run E2E tests headed (visible browser):
```bash
npm run test:e2e:headed
```

## Architecture

This is a single-page Vue 3 + TypeScript app for tracking Brazilian stock (ticker) data across multiple CSV imports. There is one route (`/`) rendered by `HomeView`.

### Data flow

```
CSV file → parseCsv() → importStore.importCsv()
                              ├─ empresaStore.ensureEmpresa()
                              └─ tickerStore.upsertTicker(codigo, nome, snapshot, cotacaoAtualFromCsv)

Refresh button → useLiveQuotes().refresh() → brapiClient.fetchQuotes()
                                                   └─ tickerStore.setLiveQuote()
```

- **`src/utils/csvParser.ts`**: Parses the proprietary CSV format. The header row is detected by searching for a line starting with `"Empresa"`. Columns are mapped by fixed index positions. `cotacaoAtual` is emitted at the top level of `ParsedCsvRow`, not inside the snapshot.
- **`src/utils/stockUtils.ts`**: `snapshotsDiffer()` defines which fields constitute a meaningful change (controls whether importing the same CSV again creates a new snapshot or is treated as "unchanged"). `computeDerived(snapshot, cotacaoAtual)` takes the current price as a second argument — derived metrics are recomputed reactively whenever `ticker.cotacaoAtual` changes. Also contains `slugify()` used as the empresa key.
- **`src/types/stock.ts`**: All shared types. **`cotacaoAtual` lives on `Ticker` (not `TickerSnapshot`)** along with `cotacaoFetchedAt` — the current price is live, never historical. Snapshots are immutable history.

### Stores (Pinia, all with `persist: true`)

Data stores (reset together on "reset" action): `importStore.reset()`, `empresaStore.reset()`, `tickerStore.reset()`.

`configStore` is **not** reset with the data stores — it holds user preferences that should survive a data wipe.

- **`tickerStore`**: Primary store. Keyed by ticker code (`Record<string, Ticker>`). Each `Ticker` holds `history: TickerSnapshot[]` plus live `cotacaoAtual?: number` + `cotacaoFetchedAt?: string`.
  - `upsertTicker(codigo, nome, snapshot, cotacaoAtualFromCsv)` returns `'new' | 'updated' | 'unchanged'`. On a new ticker the CSV price seeds `cotacaoAtual`; on existing tickers the CSV price is only used when `cotacaoAtual` is still `undefined` (never clobbers a live quote).
  - `setLiveQuote(codigo, price, fetchedAt)`: updates the live price after a brapi fetch. No-op for unknown codigos.
  - `getDerived(codigo)`: computes derived metrics using the latest snapshot + current `ticker.cotacaoAtual`.
  - `markRemovedIfNotIn()` sets status to `'removed'` for tickers absent from the latest import.
- **`empresaStore`**: Tracks companies (`Empresa`) and their associated ticker codes. Keyed by slugified company name.
- **`importStore`**: Records import batches with stats. Orchestrates the CSV import pipeline.
- **`configStore`**: UI preferences. Holds `stockTableVisibleColumns: string[]` (drives the column toggle) and exports `STOCK_TOGGLEABLE_COLUMNS` — the list of fields that can be toggled. Pinned columns (Código, Cotação, Preço Teto, Margem, Histórico) are not in that list and render unconditionally. Also persists table sort state (`stockTableSortField`, `stockTableSortOrder`) and per-column advanced filter state (`stockTableFilters`); the filterable fields and their default match modes live in `STOCK_FILTERABLE_COLUMNS` + `buildDefaultStockTableFilters()`.

### Live quotes (brapi.dev)

- **`src/services/brapiClient.ts`**: Uses plain `fetch` against `https://brapi.dev/api/quote/{codigo}?interval=1d&token=...`. **Do not reintroduce the `brapi` npm SDK** — it adds `X-Stainless-*` telemetry headers that trip brapi.dev's CORS preflight. Token goes in the query string, not a header, to keep the request a simple CORS GET.
- **Per-ticker requests**: brapi's free tier allows only one ticker per `/api/quote/` call. `fetchQuotes(codigos[])` fans out one request per ticker via `Promise.allSettled`. A single failure silently skips that ticker, and the caller keeps the previous price (no partial-response error propagation).
- **`src/composables/useLiveQuotes.ts`**: Exposes `refresh()`, `lastFetchedAt`, `isFetching`, `lastError`. **Manual refresh only — no polling.** Mounted in `StockDataTable.vue`.
- **API key storage**: The brapi token is entered by the user via the settings popover (`SettingsPopover.vue`, mounted in `StockDataTable.vue`'s table header) and persisted in `configStore.brapiApiKey`. Since `configStore` has `persist: true`, the key survives reloads and is NOT cleared by the data `reset()` action. `useLiveQuotes.refresh()` reads the key from the store and passes it to `fetchQuotes(codigos, apiKey)`; when the key is empty, `refresh()` sets `lastError` and skips the network call. **There is no env var** — E2E tests seed the key by writing `localStorage.setItem('config', JSON.stringify({ brapiApiKey: 'test-key' }))` via `page.addInitScript` before navigation.

### UI (PrimeVue 4 + Aura theme)

PrimeVue is the only UI library. **PrimeFlex is not installed** — do not use PrimeFlex utility classes (`flex`, `gap-2`, `align-items-center`, etc.). Use scoped CSS in `<style scoped>` blocks instead. For styles targeting PrimeVue-generated elements (e.g., DataTable rows), use `:deep()`.

- **Column toggle** (`StockDataTable.vue`): The table's `#header` slot renders a `MultiSelect` bound to `configStore`. Each toggleable `<Column>` is wrapped in `v-if="configStore.isStockColumnVisible('field')"`. To add a new toggleable column: append `{ field, header }` to `STOCK_TOGGLEABLE_COLUMNS` in `configStore.ts` **and** add the corresponding `<Column v-if="...">` in the template — the two must stay in sync by `field`.
- **Sort & filters** (`StockDataTable.vue`): The DataTable uses `v-model:sortField` / `v-model:sortOrder` / `v-model:filters` bound to `configStore`, with `filterDisplay="menu"` for the per-column advanced filter popup. Adding a new filterable column requires (a) appending it to `STOCK_FILTERABLE_COLUMNS` in `configStore.ts` with the right `kind` (`text` | `numeric` | `enum`) and (b) marking the `<Column filter ...>` in the template plus a `#filter` slot — `InputText` for text, `InputNumber` for numeric, `Select` for enum. PrimeVue 4's menu-mode filter renders nothing without the slot, so it is mandatory. Filter constants come from `@primevue/core/api` (`FilterMatchMode`, `FilterOperator`).
- **TickerHistoryDialog** shows snapshot fields only (`precoTeto`, `dividendYieldBruto`, `lucroLiquidoEstimado`). It does **not** show `margemSeguranca` or `plProjetado` because those require `cotacaoAtual`, which is no longer stored historically.

### Testing conventions

- **Unit tests** (Vitest): use `mount` (not `shallowMount`). Component tests require `PrimeVue` and an active Pinia in `global.plugins`. Composables that use lifecycle hooks are tested by mounting a host component that calls them and exposes their return value via `expose(api)`.
- **E2E tests** (Playwright): use `page.locator` with `data-testid` attributes. The dev server is started automatically by Playwright. `setInputFiles` works on hidden file inputs without `{ force: true }`. For live-quote tests, mock brapi at the HTTP layer: `page.route('**/api/quote/**', ...)` with `body: JSON.stringify({ results: [...] })` (object literals will silently break — `fulfill` needs a string). The mock should read the ticker code from `route.request().url()` path and return a single-result response tailored to that symbol, because the client hits the endpoint once per ticker.
