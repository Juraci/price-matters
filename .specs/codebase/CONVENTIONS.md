# Code Conventions

## Naming Conventions

**Files:**
- Vue components: `PascalCase.vue` (e.g. `StockDataTable.vue`, `CsvImport.vue`, `SettingsPopover.vue`, `TickerHistoryDialog.vue`, `LiveQuotesControls.vue`).
- TS modules: `camelCase.ts` (e.g. `tickerStore.ts`, `configStore.ts`, `csvParser.ts`, `stockUtils.ts`, `brapiClient.ts`, `useLiveQuotes.ts`, `useIsMobile.ts`).
- Tests: same basename as the module, `.spec.ts` extension, in a sibling `__tests__/` folder (e.g. `src/utils/__tests__/csvParser.spec.ts`).
- E2E specs live in `/e2e/` at the repo root, named `featureName.spec.ts` (e.g. `csvImport.spec.ts`, `liveQuotes.spec.ts`, `columnToggle.spec.ts`, `settings.spec.ts`, `sortFilterPersistence.spec.ts`).

**Functions/Methods:**
- Plain `camelCase` for everything: `parseCsv`, `computeDerived`, `snapshotsDiffer`, `slugify`, `fetchQuotes`, `upsertTicker`, `markRemovedIfNotIn`, `setLiveQuote`, `getDerived`.
- Composables are prefixed `use*`: `useLiveQuotes`, `useIsMobile`, `useTickerStore`, `useConfigStore`, `useEmpresaStore`, `useImportStore`.
- Pinia store factories follow `use<Entity>Store`.

**Variables:**
- `camelCase` (`importId`, `cotacaoAtual`, `historyRows`, `lastFetchedAt`, `selectedColumns`).
- Domain identifiers stay in **Portuguese** to match the underlying CSV / business vocabulary (`empresa`, `codigo`, `cotacaoAtual`, `precoTeto`, `dividendYieldBruto`, `lucroLiquidoEstimado`, `payoutEsperado`, `frequenciaAnuncios`, `mesesAnunciosDividendos`, `atuacao`). English is used for technical/infrastructure terms (`importId`, `filename`, `apiKey`, `status`, `history`).
- Refs are not suffixed with `Ref` (e.g. `const importing = ref(false);`, not `importingRef`).

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants and lookup tables: `STOCK_TOGGLEABLE_COLUMNS`, `STOCK_FILTERABLE_COLUMNS`, `MOBILE_HIDDEN_COLUMNS`, `MOBILE_BREAKPOINT_PX`, `VOLATILE_FIELDS`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`, `STATUS_OPTIONS`.
- TypeScript types/interfaces: `PascalCase` (`Ticker`, `TickerSnapshot`, `DerivedMetrics`, `Empresa`, `ImportBatch`, `ParsedCsvRow`, `StockToggleableColumn`, `StockFilterableColumn`).
- Type unions for closed sets: `TickerStatus = 'active' | 'removed'`, `StockFilterKind = 'text' | 'numeric' | 'enum'`.

## Code Organization

**Import / Dependency Declaration:**
External packages first, then internal `@/...` aliases, then relative imports. Type-only imports use `import type { ... }`. Example from `src/stores/tickerStore.ts:1`:

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DerivedMetrics, Ticker, TickerSnapshot } from '@/types/stock';
import { computeDerived, snapshotsDiffer } from '@/utils/stockUtils';
```

The `@/` alias (configured in `vite.config.ts` and `tsconfig.app.json`) is preferred for any cross-folder import; relative imports (`./...` or `../`) are used only for siblings within the same folder (e.g. `import LiveQuotesControls from './LiveQuotesControls.vue';` inside `StockDataTable.vue`).

**File Structure (TS modules):**
1. Imports
2. Helper types / interfaces (when local-only)
3. Module-level constants
4. Pure helpers (often non-exported)
5. Exported public API

Example: `src/utils/stockUtils.ts` declares `slugify` (export), then the `VOLATILE_FIELDS` constant with an explanatory comment, then `snapshotsDiffer`/`getDiff`/`computeDerived` (exports).

**File Structure (Pinia stores):**
- `defineStore('name', () => { ... }, { persist: true })` setup syntax everywhere.
- Inside the setup: state `ref`s first, then mutator functions, then `computed` getters, then `reset`, then a single `return { ... }` at the end exposing the public surface.
- `reset()` is mandatory on data stores. `configStore` does not expose a `reset` (preferences must survive data wipes).

**File Structure (Vue SFCs):**
- `<script setup lang="ts">` always.
- Inside `<script setup>`: imports → store/composable instantiation → reactive state → computed → functions → (no explicit `return`, top-level bindings auto-export to template).
- Then `<template>` (root element typically carries `data-testid` for E2E targeting).
- Then `<style scoped>` (PrimeFlex is not available; write CSS directly). Use `:deep(.selector)` to reach PrimeVue-generated DOM. Use a `@media (max-width: 768px)` block for mobile tweaks.

## Type Safety / Documentation

**Approach:** Strict TypeScript end-to-end. `tsconfig.app.json` enables `noUncheckedIndexedAccess: true`, so any indexed access on arrays/records yields `T | undefined` and must be narrowed. The codebase consistently uses non-null assertions (`!`) only after explicit checks or when the invariant is provable from the surrounding code — and only at call sites, never as a "shortcut" pattern.

```ts
// Example: explicit guard before assertion (src/stores/tickerStore.ts:29)
const ticker = tickers.value[codigo]!;
ticker.status = 'active';
```

```ts
// Example: optional-chained read (no assertion needed) — src/stores/tickerStore.ts:73
const ticker = tickers.value[codigo];
const snap = ticker?.history[ticker.history.length - 1];
if (!snap || !ticker) return undefined;
```

Interfaces are exported from `src/types/stock.ts` and reused everywhere; ad-hoc inline types are only used for very local DTO shapes (e.g. `BrapiQuoteResult` inside `src/services/brapiClient.ts:1` because they're an implementation detail of the client).

Function signatures prefer explicit return types when the function is exported or non-trivial:

```ts
function upsertTicker(
  codigo: string,
  empresaNome: string,
  snapshot: TickerSnapshot,
  cotacaoAtualFromCsv: number,
): 'new' | 'updated' | 'unchanged' { ... }
```

## Error Handling

**Pattern:** "Throw at the boundary, surface to the user via reactive state."

- **Pure utilities** throw plain `Error` objects with descriptive messages. Example: `parseCsv` throws `'CSV header row not found'` when the header detection fails (`src/utils/csvParser.ts:47`).
- **Stores propagate errors** by not catching them — `importStore.importCsv` lets `parseCsv` throw, and the calling component decides how to render the error. There is no global error handler.
- **Components catch at the boundary** and write to a local reactive `errorMessage` shown via PrimeVue's `<Message>`:
    ```ts
    // src/components/CsvImport.vue:23
    try { lastBatch.value = await importStore.importCsv(file); }
    catch (err) { errorMessage.value = err instanceof Error ? err.message : 'Erro ao importar arquivo'; }
    ```
- **Composables expose `lastError`** as a `ref<string | null>` rather than throwing. Example: `useLiveQuotes` (`src/composables/useLiveQuotes.ts:10`) sets `lastError.value` for both "missing API key" and caught fetch errors; the component reads `lastError` and shows a `Tag severity="danger"`.
- **Network failures degrade silently per-ticker.** `services/brapiClient.ts:30` uses `Promise.allSettled` and skips failed tickers — the caller keeps the previous `cotacaoAtual` rather than zeroing it out. Only a top-level `fetchQuotes` rejection (rare) reaches the composable's `catch`.

## Comments / Documentation

**Style:** Comments are reserved for the "why" — non-obvious invariants, intentional trade-offs, or constraints not visible in code. There are no JSDoc blocks; no per-function documentation; no banner comments.

Recurring comment kinds:

- **Invariant explanations** — e.g. `src/stores/tickerStore.ts:32`:
    ```ts
    // Seed from CSV only if we have no live quote yet.
    if (ticker.cotacaoAtual === undefined) ticker.cotacaoAtual = cotacaoAtualFromCsv;
    ```
- **Intentional trade-offs** — e.g. `src/utils/csvParser.ts:18`:
    ```ts
    // Note: does not handle RFC 4180 doubled-quote escaping ("" for a literal ")
    // The production CSV never contains embedded quotes, so this is acceptable.
    ```
- **Cross-cutting design pointers** — e.g. `src/stores/configStore.ts:32`:
    ```ts
    // Hidden by default on a fresh install when the user is on a narrow viewport.
    // This is initialization only — the user can re-enable any of these via the
    // column toggle, and persisted state always wins on subsequent loads.
    ```
- **External-API quirks** — e.g. `src/services/brapiClient.ts:27`:
    ```ts
    // brapi's free tier limits each GET /api/quote to a single ticker, so fan out
    // one request per code. allSettled: a failure on one ticker must not cancel
    // the others — we just skip it and the caller keeps the previous price.
    ```

User-visible UI strings are in **Portuguese (pt-BR)**: button labels (`"Importar CSV"`, `"Limpar dados"`, `"Atualizar cotações"`), tags, error messages, and column headers. Currency is formatted via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Numbers and dates use `'pt-BR'` locale.

CSS is plain, scoped per component. `:deep(...)` reaches into PrimeVue internals (e.g. `:deep(.removed-row) { opacity: 0.5 }`). Custom CSS variables from PrimeVue are referenced directly (`var(--p-text-muted-color)`).
