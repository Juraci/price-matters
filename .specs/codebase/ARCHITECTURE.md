# Architecture

**Pattern:** Single-page Vue 3 application with a layered, store-centric architecture. Pinia is the system of record; UI components are thin renderers, composables encapsulate side effects, services wrap network I/O, utilities are pure functions.

## High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│ src/views/HomeView.vue   (single route: /)              │
│ ┌────────────────────────┐  ┌───────────────────────┐   │
│ │ CsvImport.vue          │  │ StockDataTable.vue    │   │
│ │ (file upload + reset)  │  │ (renders all tickers, │   │
│ └────────┬───────────────┘  │  hosts settings +     │   │
│          │                  │  live-quotes refresh) │   │
│          │                  └────────┬──────────────┘   │
└──────────┼───────────────────────────┼──────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────┐
│ utils/csvParser.ts   │    │ composables/             │
│ (pure parser)        │    │ useLiveQuotes.ts         │
└──────────┬───────────┘    │ useIsMobile.ts           │
           │                └──────────┬───────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│ Pinia stores (persist: true → localStorage)             │
│  importStore  ──orchestrates──▶ empresaStore + tickerStore │
│  configStore (UI prefs, brapi key — survives data reset)│
└──────────────────────────────────────┬──────────────────┘
                                       │ (live-quote fetch only)
                                       ▼
                          ┌──────────────────────────┐
                          │ services/brapiClient.ts  │
                          │ → https://brapi.dev/...  │
                          └──────────────────────────┘
```

## Identified Patterns

### Pinia setup-style stores with persistence

**Location:** `src/stores/*.ts`
**Purpose:** Single source of truth for ticker data, companies, import history, and UI prefs. Survives reload via `pinia-plugin-persistedstate`.
**Implementation:** Every store uses Pinia's setup syntax (`defineStore('name', () => { ... }, { persist: true })`). State is exposed as `ref`s, derived state as `computed`, mutations as plain functions returned from setup.
**Example:** `src/stores/tickerStore.ts:6` — `useTickerStore` exposes `tickers`, `lastFetchedAt`, mutators (`upsertTicker`, `setLiveQuote`, `markRemovedIfNotIn`), getters (`allTickers`, `activeTickers`, `getDerived`), and a `reset()`.

### Layered separation: components → composables → stores → services / utils

**Location:** `src/{components,composables,stores,services,utils,types}/`
**Purpose:** Keeps components free of business logic and side effects. UI components don't `fetch`; they call composables. Composables don't compute derived metrics; they delegate to stores/utils.
**Implementation:**
- **Components** (`src/components/*.vue`): render state from stores, dispatch user intent.
- **Composables** (`src/composables/*.ts`): orchestrate cross-store flows and own transient UI state (`isFetching`, `lastError`, viewport `isMobile`).
- **Stores** (`src/stores/*.ts`): own all persistent state and mutation invariants.
- **Services** (`src/services/brapiClient.ts`): wrap external HTTP. No store imports.
- **Utils** (`src/utils/*.ts`): pure functions — no Vue, no Pinia, no I/O.
**Example:** `useLiveQuotes` (`src/composables/useLiveQuotes.ts:6`) reads codigos from `tickerStore`, reads the API key from `configStore`, calls `fetchQuotes` from the service, then writes back via `tickerStore.setLiveQuote`.

### Snapshot history with selective change detection

**Location:** `src/stores/tickerStore.ts:12` (`upsertTicker`) + `src/utils/stockUtils.ts:18` (`VOLATILE_FIELDS`, `snapshotsDiffer`)
**Purpose:** Each CSV import contributes a `TickerSnapshot` to `Ticker.history[]`, but only when a "volatile" business field actually changed (`precoTeto`, `lucroLiquidoEstimado`, `dividaLiquidaEbitda`, `payoutEsperado`, `cagrLucros5Anos`, `quantidadeTotalAcoes`). Re-importing the same CSV is a no-op.
**Implementation:** `upsertTicker` returns `'new' | 'updated' | 'unchanged'` and the import store aggregates these into batch stats (`stats.newTickers`, `stats.updatedTickers`, `stats.unchangedTickers`).
**Example:** `src/stores/importStore.ts:33` loops rows and increments stats; `src/utils/stockUtils.ts:27` performs the diff.

### Live price separated from historical snapshots

**Location:** `src/types/stock.ts:32` (`Ticker.cotacaoAtual`) + `src/stores/tickerStore.ts:44` (`setLiveQuote`)
**Purpose:** `cotacaoAtual` is current/live; storing it in history would pollute snapshots and trigger spurious "updated" classifications on every re-import. So `cotacaoAtual` and `cotacaoFetchedAt` live on `Ticker`, NOT on `TickerSnapshot`. Snapshots are immutable history.
**Implementation:**
- On a new ticker, the CSV's "Cotação atual" column seeds `cotacaoAtual`.
- On an existing ticker, the CSV value is only used if `cotacaoAtual` is still `undefined` — never clobbers a live brapi quote.
- Derived metrics (`margemSeguranca`, `plProjetado`, `dividendYieldBruto`, `valorDeMercado`, etc.) are recomputed reactively whenever `cotacaoAtual` changes.
**Example:** `tickerStore.upsertTicker` at `src/stores/tickerStore.ts:33` uses `if (ticker.cotacaoAtual === undefined) ticker.cotacaoAtual = cotacaoAtualFromCsv;`.

### Derived metrics as pure functions

**Location:** `src/utils/stockUtils.ts:36` (`computeDerived`)
**Purpose:** Six fields (`margemSeguranca`, `lucroPorAcaoEstimado`, `plProjetado`, `dividendoPorAcaoBruto`, `dividendYieldBruto`, `valorDeMercado`) are derived from `(snapshot, cotacaoAtual)` and never stored. Recomputed on every read via `tickerStore.getDerived` and the `tableRows` computed in `StockDataTable.vue`.
**Implementation:** `computeDerived(snapshot: TickerSnapshot, cotacaoAtual: number): DerivedMetrics`. Guards against division by zero. `dividendYieldBruto` is rounded to 2 decimal places (basis-point precision).
**Example:** Used at `src/stores/tickerStore.ts:75` and indirectly in `StockDataTable.vue:71`.

### Soft-delete via `status` flag

**Location:** `src/types/stock.ts:30` (`TickerStatus`) + `src/stores/tickerStore.ts:55` (`markRemovedIfNotIn`)
**Purpose:** Tickers absent from the latest CSV are flagged `'removed'` rather than deleted, preserving history. A subsequent import containing the ticker re-activates it.
**Implementation:** `importStore.importCsv` builds a `Set<string>` of imported codigos and calls `tickerStore.markRemovedIfNotIn`, which iterates current tickers and toggles status. `upsertTicker` resets status to `'active'` whenever a ticker reappears.
**Example:** `src/stores/importStore.ts:50` (`stats.removedTickers = tickerStore.markRemovedIfNotIn(importedCodigos)`).

### `configStore` survives data reset

**Location:** `src/stores/configStore.ts:113` and `src/components/CsvImport.vue:41` (`handleReset`)
**Purpose:** "Limpar dados" wipes business data (imports, empresas, tickers) but preserves user preferences — column visibility, sort/filter state, and the brapi API key.
**Implementation:** `handleReset` calls `importStore.reset() + empresaStore.reset() + tickerStore.reset()` only. `configStore` is intentionally untouched.

### Responsive UI via `useIsMobile` + `MOBILE_HIDDEN_COLUMNS`

**Location:** `src/composables/useIsMobile.ts` + `src/stores/configStore.ts:35,49`
**Purpose:** On a fresh install with a narrow viewport (`max-width: 768px`), some columns default to hidden (`empresaNome`, `status`, `atuacao`, `ultimaAtualizacao`). After the first run, persisted state always wins.
**Implementation:** `buildDefaultVisibleColumns()` in `configStore.ts` checks `window.matchMedia` once at store init. `SettingsPopover.vue` swaps `Popover` (desktop) for `Drawer` (mobile) based on the same composable. `TickerHistoryDialog.vue` opens maximised on mobile.

## Data Flow

### CSV import

```
File (User picks)
  → CsvImport.handleFileChange
    → importStore.importCsv(file)
      → file.text() + crypto.randomUUID()
      → parseCsv(content, importId, filename, importedAt)   // utils/csvParser.ts
      → for each row:
          empresaStore.ensureEmpresa(row.empresa, row.codigo)
          tickerStore.upsertTicker(row.codigo, row.empresa, row.snapshot, row.cotacaoAtual)
            → 'new' | 'updated' | 'unchanged'  (stats accumulate)
      → tickerStore.markRemovedIfNotIn(importedCodigos)
      → batches.value.push(batch)
  → CsvImport.lastBatch = batch  (renders success Tags)
```

CSV format quirks: header row is detected by `lines.findIndex(line => line.trimStart().startsWith('Empresa'))`. Columns are addressed by **fixed index positions** (0..20). Brazilian number format is parsed manually (`R$ 1.234,56` → `1234.56`, `5,0%` → `5`). The columns at positions 4, 6, 11, 13, 14, 17 in the source CSV are derived (Valor de mercado, P/L projetado, LPA, DPA bruto, DY, Margem) and are intentionally **ignored** during parse and recomputed via `computeDerived`.

### Live quote refresh

```
User clicks "Atualizar cotações"
  → LiveQuotesControls emits 'refresh'
  → useLiveQuotes.refresh()
      ├─ guard: !configStore.isBrapiConfigured  → set lastError, return
      ├─ guard: codigos.length === 0            → return
      ├─ isFetching = true
      ├─ fetchQuotes(codigos, apiKey)            // services/brapiClient.ts
      │    → Promise.allSettled(codigos.map(fetchOne))
      │    → fetchOne: fetch(`https://brapi.dev/api/quote/{c}?interval=1d&token=...`)
      │    → returns Record<symbol, price>; failures silently skipped
      ├─ for each (codigo, price): tickerStore.setLiveQuote(...)
      ├─ tickerStore.setLastFetchedAt(now)
      └─ isFetching = false
  → DataTable re-renders (computed tableRows recomputes derived metrics)
```

Manual refresh only — there is no polling.

### Snapshot diff (history dialog)

```
User clicks history button (StockDataTable)
  → openHistory(ticker)  → historyVisible = true
  → TickerHistoryDialog
      ├─ snapshotOptions: filename + formatted importedAt per snapshot
      ├─ default fromIdx = len-2, toIdx = len-1 (auto-pick last two)
      ├─ getDiff(prev, last) from stockUtils  → microdiff filtered to VOLATILE_FIELDS
      └─ renders diff rows with arrow + tone (good/bad/neutral) per FIELD_GOOD_DIRECTION
```

## Code Organization

**Approach:** Layer-based with a thin feature-aware seam. Folders correspond to layers (`components`, `composables`, `stores`, `services`, `utils`, `types`, `views`, `router`); within each, files are named after the domain entity or capability they own.

**Structure:** See `STRUCTURE.md` for the directory tree.

**Module boundaries:**
- `types/stock.ts` is the only place where domain shapes live; everything else imports from `@/types/stock`.
- `utils/*` files are pure (no Vue, no Pinia, no I/O) — safe to call from anywhere.
- `services/*` only does network I/O — no store imports, no Vue reactivity.
- `stores/*` may import from `utils/*` and `types/*`. Cross-store imports happen (e.g., `importStore` calls `empresaStore` + `tickerStore`); orchestration is intentionally placed in the store closest to the user action.
- `composables/*` may import from stores and services; components prefer composables over services.
- `components/*` import from stores, composables, types, and other components — never from services directly.
