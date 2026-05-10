# Project Structure

**Root:** `/home/juraci/personal/price-matters`

## Directory Tree

```
price-matters/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions — lint, type-check, format, unit, build, e2e
├── .vscode/                        # Editor recommendations (extensions.json tracked)
├── e2e/
│   ├── fixtures/
│   │   ├── stocks-sample-v1.csv    # Reference CSV for happy-path tests
│   │   └── stocks-sample-v2.csv    # Modified version — drives diff/update assertions
│   ├── columnToggle.spec.ts
│   ├── csvImport.spec.ts
│   ├── liveQuotes.spec.ts
│   ├── settings.spec.ts
│   ├── sortFilterPersistence.spec.ts
│   └── tsconfig.json
├── public/                         # Static assets served at /
├── src/
│   ├── App.vue                     # Top-level shell — only renders <RouterView />
│   ├── main.ts                     # createApp + Pinia + Pinia persistedstate + PrimeVue (Aura)
│   ├── assets/                     # main.css and image assets
│   ├── components/
│   │   ├── __tests__/              # Vitest component specs (mount + Pinia + PrimeVue)
│   │   ├── CsvImport.vue           # File upload + reset
│   │   ├── LiveQuotesControls.vue  # Refresh button + last-fetched tag + error tag
│   │   ├── SettingsPopover.vue     # Brapi API key entry (Popover desktop / Drawer mobile)
│   │   ├── StockDataTable.vue      # Main table — column toggle, filters, sort, derived metrics
│   │   └── TickerHistoryDialog.vue # Snapshot history + diff between two snapshots
│   ├── composables/
│   │   ├── __tests__/
│   │   ├── useIsMobile.ts          # matchMedia wrapper, returns reactive isMobile
│   │   └── useLiveQuotes.ts        # refresh/lastFetchedAt/isFetching/lastError
│   ├── router/
│   │   └── index.ts                # Single route '/' → HomeView
│   ├── services/
│   │   └── brapiClient.ts          # fetch-based brapi.dev client, fan-out + Promise.allSettled
│   ├── stores/
│   │   ├── __tests__/
│   │   ├── configStore.ts          # UI prefs: visible columns, sort/filter, brapi key
│   │   ├── counter.ts              # Vite scaffold leftover — unused
│   │   ├── empresaStore.ts         # Empresas keyed by slugified name
│   │   ├── importStore.ts          # Import batches + orchestrator (parseCsv + upserts)
│   │   └── tickerStore.ts          # Tickers keyed by code, history, live quote
│   ├── types/
│   │   └── stock.ts                # Domain types — single source of truth
│   ├── utils/
│   │   ├── __tests__/
│   │   ├── csvParser.ts            # Pure CSV parser (BR number/currency/percent helpers)
│   │   └── stockUtils.ts           # slugify, snapshotsDiffer, getDiff, computeDerived
│   └── views/
│       └── HomeView.vue            # The only view — composes CsvImport + StockDataTable
├── CLAUDE.md                       # Repo guidelines for Claude (architecture, dos/don'ts)
├── README.md                       # Vite scaffold readme (mostly default)
├── env.d.ts                        # Vite env shims
├── eslint.config.ts                # Flat ESLint config (oxlint pre-pass + ESLint)
├── index.html                      # SPA entry point — references /src/main.ts
├── package.json                    # Scripts + deps
├── playwright.config.ts            # E2E config (chromium, dev server on 5173 / preview 4173)
├── tsconfig.json                   # Project references
├── tsconfig.app.json               # App TS config — path alias, noUncheckedIndexedAccess
├── tsconfig.node.json              # TS config for build/Vite configs
├── tsconfig.vitest.json            # TS config for unit tests
├── vite.config.ts                  # Vite + Vue plugin + DevTools, '@' alias
└── vitest.config.ts                # Vitest config — extends vite.config.ts, jsdom, excludes e2e/**
```

## Module Organization

### Top-level (`src/main.ts`, `src/App.vue`, `src/router/`)

**Purpose:** App bootstrap and routing.
**Location:** `src/main.ts` mounts the app, registers Pinia (with persistence), registers PrimeVue with the Aura preset, and installs the router. `App.vue` is intentionally minimal (only `<RouterView />`).
**Key files:** `main.ts`, `App.vue`, `router/index.ts`.

### Views (`src/views/`)

**Purpose:** Route-level page components; one component per route.
**Location:** Single page — `HomeView.vue` — composes `CsvImport` and `StockDataTable` with a small responsive header.
**Key files:** `views/HomeView.vue`.

### Components (`src/components/`)

**Purpose:** Re-usable UI pieces; all are stateful in the sense that they read from stores, but most own only transient UI state (open/closed dialogs, in-flight flags).
**Location:** Flat — no per-feature subfolder; all five components sit at the top level.
**Key files:**
- `StockDataTable.vue` — the central component (PrimeVue `DataTable` with menu-mode filters per column, sort persistence, column toggle, ramp-coloured cells for `margemSeguranca` and `dividaLiquidaEbitda`).
- `CsvImport.vue` — file upload (hidden `<input type="file">` triggered by a Button), shows last-batch stats, hosts the "Limpar dados" button.
- `SettingsPopover.vue` — desktop popover / mobile drawer for the brapi API key.
- `TickerHistoryDialog.vue` — modal showing snapshot history and diff between two snapshots.
- `LiveQuotesControls.vue` — small bar with the refresh button, last-fetched timestamp, and an error tag.

### Composables (`src/composables/`)

**Purpose:** Reusable reactive logic that orchestrates stores/services or wraps DOM APIs.
**Location:** Flat. Each composable lives in one file and tests live next to it under `__tests__/`.
**Key files:** `useLiveQuotes.ts`, `useIsMobile.ts`.

### Stores (`src/stores/`)

**Purpose:** Persistent state and mutation invariants. Pinia setup-style stores with `persist: true`.
**Location:** Flat. Each store represents one bounded context.
**Key files:** `tickerStore.ts`, `empresaStore.ts`, `importStore.ts`, `configStore.ts`. `counter.ts` is the Vite scaffold leftover and is **not used** anywhere — see `CONCERNS.md`.

### Services (`src/services/`)

**Purpose:** External I/O. Pure-ish modules with no Vue or Pinia dependencies.
**Location:** Flat.
**Key files:** `brapiClient.ts` (the only service).

### Utils (`src/utils/`)

**Purpose:** Pure helpers — parsing, derivations, slug generation. No reactivity, no I/O.
**Location:** Flat.
**Key files:** `csvParser.ts`, `stockUtils.ts`.

### Types (`src/types/`)

**Purpose:** Domain type definitions consumed by every layer.
**Location:** Single file — `stock.ts`.
**Key files:** `stock.ts` (`Ticker`, `TickerSnapshot`, `DerivedMetrics`, `Empresa`, `ImportBatch`, `ParsedCsvRow`, `TickerStatus`).

### Tests

- **Unit / component:** colocated in `src/<layer>/__tests__/<name>.spec.ts`.
- **E2E:** `/e2e/` at the repo root, with shared fixtures under `e2e/fixtures/`.

## Where Things Live

**CSV import:**
- UI: `src/components/CsvImport.vue`
- Business Logic: `src/stores/importStore.ts` (orchestrator), `src/utils/csvParser.ts` (parser)
- Data Access: `src/stores/empresaStore.ts`, `src/stores/tickerStore.ts`
- Configuration: none (parsing is pure)

**Live quotes:**
- UI: `src/components/LiveQuotesControls.vue` (mounted inside `StockDataTable.vue`'s `#header` slot)
- Business Logic: `src/composables/useLiveQuotes.ts`
- Data Access: `src/services/brapiClient.ts`, `src/stores/tickerStore.ts` (writes), `src/stores/configStore.ts` (reads API key)
- Configuration: `configStore.brapiApiKey` set via `SettingsPopover.vue`

**Stock table (sort, filter, column visibility):**
- UI: `src/components/StockDataTable.vue`
- Business Logic: PrimeVue `DataTable` v-models bound to `configStore`
- Data Access: `src/stores/tickerStore.ts` (`allTickers`, `getLatestSnapshot`, `getDerived`)
- Configuration: `STOCK_TOGGLEABLE_COLUMNS`, `STOCK_FILTERABLE_COLUMNS`, `MOBILE_HIDDEN_COLUMNS`, `buildDefaultStockTableFilters` in `src/stores/configStore.ts`

**Snapshot history & diff:**
- UI: `src/components/TickerHistoryDialog.vue`
- Business Logic: `src/utils/stockUtils.ts` (`getDiff`, `VOLATILE_FIELDS`)
- Data Access: `Ticker.history[]` via prop

**Derived metrics (margem de segurança, P/L projetado, etc.):**
- Business Logic: `src/utils/stockUtils.ts` (`computeDerived`)
- Data Access: `tickerStore.getDerived(codigo)` and `StockDataTable.tableRows` computed

**API key + settings:**
- UI: `src/components/SettingsPopover.vue`
- Data Access: `src/stores/configStore.ts` (`brapiApiKey`, `setBrapiApiKey`, `isBrapiConfigured`)

## Special Directories

**`src/assets/`:**
**Purpose:** Static assets bundled by Vite.
**Examples:** `main.css` (imported by `main.ts`).

**`e2e/fixtures/`:**
**Purpose:** Sample CSV files used by Playwright tests.
**Examples:** `stocks-sample-v1.csv`, `stocks-sample-v2.csv` (intentionally diverge so the suite can exercise diff/update flows).

**`__tests__/` (one per source folder):**
**Purpose:** Vitest unit/component tests, colocated next to the code they exercise.
**Examples:** `src/utils/__tests__/csvParser.spec.ts`, `src/stores/__tests__/tickerStore.spec.ts`, `src/components/__tests__/StockDataTable.spec.ts`.

**`dist/`, `playwright-report/`, `test-results/`:**
**Purpose:** Build and test artefacts. All gitignored.

**`.specs/`:**
**Purpose:** Spec-driven planning workspace (this directory). Brownfield analysis lives under `.specs/codebase/`; future feature specs go under `.specs/features/`.
