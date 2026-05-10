# External Integrations

## Stock Quote API

**Service:** brapi.dev — Brazilian stock market quote API
**Purpose:** Provides live `regularMarketPrice` for B3-listed tickers, used to update `Ticker.cotacaoAtual` and recompute derived metrics (`margemSeguranca`, `plProjetado`, `dividendYieldBruto`, `valorDeMercado`, etc.) reactively.
**Implementation:** `src/services/brapiClient.ts`. Calls `https://brapi.dev/api/quote/{codigo}?interval=1d&token=<apiKey>` with **plain `fetch`**, one request per ticker, fanned out via `Promise.allSettled`. Failed individual requests are silently skipped — the caller (`useLiveQuotes`) keeps the previous price for that ticker. Non-OK HTTP responses also return `null` (treated as a miss).
**Configuration:** Free-tier brapi accounts allow only one ticker per `/api/quote/` request, hence the per-ticker fan-out. The `interval=1d` query param is fixed.
**Authentication:** `token` query parameter (NOT a header). The token is the user-supplied brapi API key, stored in `configStore.brapiApiKey` (persisted to `localStorage` via `pinia-plugin-persistedstate`) and entered through `SettingsPopover.vue`. **There is no `.env` variable for the key in production code** — the only env-related file is `.env.local`, but the app does not read from it. E2E tests seed the key by writing `localStorage.setItem('config', JSON.stringify({ brapiApiKey: 'test-key' }))` in `page.addInitScript`.

**Critical constraint (do not regress):** The codebase deliberately uses **plain `fetch` instead of the `brapi` npm SDK**. The SDK adds `X-Stainless-*` telemetry headers that trip brapi.dev's CORS preflight, breaking browser requests. Token must remain in the query string, not a header, to keep the call a simple CORS GET. See the comment block in `CLAUDE.md` and `src/services/brapiClient.ts:11`.

## Browser Persistence (localStorage)

**Service:** Browser `localStorage`, accessed via `pinia-plugin-persistedstate` ^4.7.1
**Purpose:** Persists every Pinia store across page reloads. This is the only data layer in the app — there is no server.
**Implementation:** `src/main.ts:7,16` registers the plugin globally. Each store opts in by passing `{ persist: true }` as the third argument to `defineStore(...)`. Default config: each store serialises its full state to a `localStorage` key named after the store's `id`.
**Storage keys (all `localStorage`):**
- `ticker` — `useTickerStore` state (`tickers`, `lastFetchedAt`)
- `empresa` — `useEmpresaStore` state (`empresas`)
- `import` — `useImportStore` state (`batches`)
- `config` — `useConfigStore` state (`stockTableVisibleColumns`, `brapiApiKey`, `stockTableSortField`, `stockTableSortOrder`, `stockTableFilters`)
- `counter` — leftover from the Vite scaffold; not actually used
**Configuration:** Default plugin behaviour — no custom `paths`, `serializer`, or `storage` overrides. There is no schema versioning or migration; if the persisted shape diverges from the current TS shape on a future deploy, the store will hydrate inconsistent state.

## API Integrations

### brapi.dev (live quotes)

**Purpose:** See "Stock Quote API" above.
**Location:** `src/services/brapiClient.ts`. Used by `src/composables/useLiveQuotes.ts`.
**Authentication:** API key in `?token=<key>` query string.
**Key endpoints used:**
- `GET /api/quote/{ticker}?interval=1d&token=<key>` — returns `{ results: [{ symbol, regularMarketPrice, ... }] }`. Only `symbol` and `regularMarketPrice` are read (everything else is ignored). One ticker per call (free-tier limit).

The full brapi response shape is documented in the E2E mock at `e2e/liveQuotes.spec.ts:15` (`buildResult`), which mirrors the actual API for tests.

## Webhooks

None. The app is a static SPA with no server component, no inbound webhooks, and no notifications.

## Background Jobs

None. There is no polling, no scheduler, no service worker, no `setInterval`-based refresh. Live-quote refresh is **strictly manual** — the user clicks "Atualizar cotações" in `LiveQuotesControls.vue`, which calls `useLiveQuotes.refresh()`. See `CLAUDE.md` and the unit test at `src/composables/__tests__/useLiveQuotes.spec.ts:65` (`'does not fetch on mount (manual refresh only)'`).

## CSV Data Source (manual upload)

**Service:** Local file picker (`<input type="file" accept=".csv">`)
**Purpose:** Primary data ingest path. The user exports a proprietary spreadsheet to CSV (Brazilian locale: `R$ 1.234,56` currency, `5,0%` percent, `,` decimal) and uploads it through `CsvImport.vue`.
**Implementation:** `src/components/CsvImport.vue` reads the file via `File.text()`; `src/stores/importStore.ts` orchestrates the parse + upsert flow; `src/utils/csvParser.ts` does the parsing.
**Format quirks:** Header row is detected by `lines.findIndex(line => line.trimStart().startsWith('Empresa'))` — preceding rows (typically `Link >,PLANILHA,,,...` plus a blank) are skipped. Columns are addressed by **fixed index positions** (0..20). Several columns are derived in the source (Valor de mercado, P/L projetado, LPA, DPA bruto, DY, Margem) and are **ignored on parse** — the app recomputes them in `computeDerived` from the snapshot's primitive fields plus the live `cotacaoAtual`.
**Configuration:** None — the parser is hard-coded to this format.

## CI / Build Integrations

**Service:** GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`).
**Purpose:** Run the full quality gate (lint + type-check + format-check + unit + build + E2E) on every push to `master` and every pull request.
**Implementation:** `.github/workflows/ci.yml`. Node version comes from `.nvmrc` (currently `24.13.0`). `npx playwright install --with-deps chromium` provisions browsers. On failure, the Playwright HTML report is uploaded as an artifact (`playwright-report/`, retained 7 days).
**Authentication:** Default `GITHUB_TOKEN` only — no external secrets are referenced.

## Telemetry / Monitoring

None. No error tracking (Sentry, Bugsnag, etc.), no analytics, no feature flags, no remote config.
