# Post-Import Diff Dialog Design

**Spec**: `.specs/features/post-import-diff-dialog/spec.md`
**Status**: Draft

---

## Architecture Overview

After `importStore.importCsv()` resolves, `CsvImport.vue` exposes the batch ID to a new `ImportDiffDialog`, which queries `tickerStore` for tickers whose latest snapshot belongs to this batch AND who have a prior snapshot to diff against. Each matched ticker is rendered via a shared `TickerDiffTable` component — the same component that will replace the inline diff table in `TickerHistoryDialog`.

```mermaid
graph TD
    A[CsvImport.vue<br/>handleFileChange] -->|batch.id| B[ImportDiffDialog.vue]
    B -->|filter tickers| C[tickerStore.tickers]
    C -->|history -2 / -1| D[buildDiffRows<br/>stockUtils.ts]
    D -->|DiffRow[]| E[TickerDiffTable.vue]
    F[TickerHistoryDialog.vue] -->|DiffRow[]| E
```

**Key insight**: `TickerDiffTable` becomes the single rendering source for the diff table in both dialogs, eliminating the current duplication risk flagged in CONCERNS.md for microdiff casts.

---

## Code Reuse Analysis

### Existing Code to Leverage

| Component / Utility | Location | How Used |
|---------------------|----------|----------|
| `getDiff()` | `src/utils/stockUtils.ts:31` | Called inside new `buildDiffRows()` |
| `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`, `DiffRow`, `formatBRL` | `src/components/TickerHistoryDialog.vue:36-90` | **Moved** to `stockUtils.ts`, re-imported by both dialogs |
| `useIsMobile()` | `src/composables/useIsMobile.ts` | Same mobile-maximise pattern as `TickerHistoryDialog` |
| PrimeVue `Dialog` | primevue/dialog | Same import/pattern as `TickerHistoryDialog` |
| PrimeVue `DataTable` + `Column` | primevue | Extracted into `TickerDiffTable.vue` |
| `tickerStore.tickers` | `src/stores/tickerStore.ts` | Filtered by `importId` in `ImportDiffDialog` |
| Diff table CSS variables | `TickerHistoryDialog.vue:244-260` | Moved to `TickerDiffTable.vue` scoped style |

### CONCERNS.md Flags Addressed

| Concern | How This Design Responds |
|---------|--------------------------|
| `microdiff` opaque records — casts spread across components | `buildDiffRows()` in `stockUtils.ts` becomes the **single** location for `d.oldValue as number` casts; both dialogs call it instead of duplicating the cast logic |

---

## Components

### `DiffRow` + shared constants (moved to `src/utils/stockUtils.ts`)

- **Purpose**: Single source of truth for the diff data model and field metadata used by both dialogs
- **Exports added**: `DiffRow` interface, `formatBRL`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`, `buildDiffRows(prev, last)`
- **`buildDiffRows` signature**: `(prev: TickerSnapshot, last: TickerSnapshot) => DiffRow[]`
- **Dependencies**: existing `getDiff()` (same file)
- **Reuses**: existing `getDiff()`, existing `VOLATILE_FIELDS`

### `TickerDiffTable.vue` (new — `src/components/`)

- **Purpose**: Pure presentational component that renders one ticker's diff as a PrimeVue DataTable
- **Props**: `rows: DiffRow[]`
- **Emits**: none
- **Template**: extracted verbatim from `TickerHistoryDialog.vue:190-207` — keeps `data-test-snapshot-diff` and `data-test-diff-tone` attributes
- **Style**: moves `.diff-table`, `.diff-new.*`, `.diff-arrow` CSS from `TickerHistoryDialog.vue`
- **Dependencies**: `DiffRow` from `@/utils/stockUtils`, PrimeVue `DataTable`/`Column`
- **Reuses**: existing diff table markup + CSS

### `TickerHistoryDialog.vue` (modified — `src/components/`)

- **Changes**:
  - Remove: local `DiffRow`, `formatBRL`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`
  - Import: the above from `@/utils/stockUtils`; `TickerDiffTable` from `./TickerDiffTable.vue`
  - Simplify `diffRows` computed: replace inline mapping block with `buildDiffRows(prev, last)`
  - Replace inline `<DataTable>` diff block with `<TickerDiffTable :rows="diffRows" />`
  - Remove diff-specific CSS (moved to `TickerDiffTable.vue`)
- **No behaviour change** — this is a pure refactor; all existing tests must stay green

### `ImportDiffDialog.vue` (new — `src/components/`)

- **Purpose**: Auto-opening modal that summarises all field changes from the most recent import
- **Props**: `visible: boolean`, `batchId: string | null`
- **Emits**: `update:visible: [value: boolean]`
- **Key computed**:
  - `updatedTickers` — `Object.values(tickerStore.tickers).filter(t => t.history.length >= 2 && t.history.at(-1)?.importId === batchId)`
  - `diffsByTicker` — maps each updated ticker to `{ codigo, rows: buildDiffRows(history[-2]!, history[-1]!) }`
- **Template**: PrimeVue `Dialog` with `data-test-import-diff-dialog`; iterates `diffsByTicker` with ticker code heading + `<TickerDiffTable>`; shows "Sem atualizações" when list is empty
- **Dependencies**: `tickerStore`, `buildDiffRows`, `useIsMobile`, `TickerDiffTable`, PrimeVue `Dialog`

### `CsvImport.vue` (modified — `src/components/`)

- **Changes**: add `diffVisible: ref(false)`, `diffBatchId: ref<string | null>(null)`; after successful import set both; add `<ImportDiffDialog v-model:visible="diffVisible" :batchId="diffBatchId" />` to template
- **No change to** `handleReset` — `diffVisible` starts `false` and a new import replaces `diffBatchId`

---

## Data Models

### `DiffRow` (new export from `src/utils/stockUtils.ts`)

```typescript
export interface DiffRow {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  tone: 'good' | 'bad' | 'neutral';
  arrow: '↑' | '↓' | '';
}
```

### Internal to `ImportDiffDialog` (no export needed)

```typescript
interface TickerDiffEntry {
  codigo: string;
  rows: DiffRow[];
}
```

---

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to centralise diff logic | `stockUtils.ts` | Pure function, no Vue/Pinia dep — belongs in utils per project layering |
| How to detect "updated" tickers | Filter `tickerStore.tickers` in `ImportDiffDialog` computed | Display-specific logic belongs in the component, not the store |
| Dialog vs. Popover | PrimeVue `Dialog` (modal) | User confirmed; practical for variable-length content list |
| Non-null assertions in `diffsByTicker` | `history.at(-2)!` / `history.at(-1)!` | Safe — the `updatedTickers` filter already guarantees `length >= 2` |
