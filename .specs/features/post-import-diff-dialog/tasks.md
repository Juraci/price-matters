# Post-Import Diff Dialog Tasks

**Design**: `.specs/features/post-import-diff-dialog/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation

```
T1
```

### Phase 2: Shared Presentation Component

```
T1 → T2
```

### Phase 3: Both Dialogs (Parallel)

```
        ┌→ T3 [P] ─┐
T2 ─────┤           ├──→ T5
        └→ T4 [P] ─┘
```

### Phase 4: Integration + E2E

```
T3, T4 → T5
```

---

## Task Breakdown

### T1: Export diff utilities from `stockUtils.ts`

**What**: Add `DiffRow` interface, `formatBRL`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`, and `buildDiffRows()` as named exports; update `stockUtils.spec.ts` with tests for `buildDiffRows`
**Where**: `src/utils/stockUtils.ts` + `src/utils/__tests__/stockUtils.spec.ts`
**Depends on**: None
**Reuses**: existing `getDiff()` and `VOLATILE_FIELDS` in the same file; field metadata currently in `TickerHistoryDialog.vue:64-90`
**Requirement**: DIFF-03, DIFF-04

**Done when**:
- [ ] `DiffRow` interface exported from `stockUtils.ts`
- [ ] `formatBRL`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION` exported
- [ ] `buildDiffRows(prev, last)` exported — calls `getDiff()`, filters `type === 'CHANGE'`, maps to `DiffRow[]` with tone and arrow logic (extracted verbatim from `TickerHistoryDialog.vue:123-152`)
- [ ] `stockUtils.spec.ts` has new `describe('buildDiffRows')` tests: (a) returns `[]` for identical snapshots, (b) correct `label`/`oldValue`/`newValue` format for `precoTeto` increase (good/↑/green), (c) correct tone for `dividaLiquidaEbitda` increase (bad/↑/red), (d) correct tone for decrease in an "up is good" field
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: ≥22 tests pass (18 existing + ≥4 new)

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(stock-utils): export DiffRow, buildDiffRows, and field metadata`

---

### T2: Create `TickerDiffTable.vue`

**What**: New pure-presentational component that renders a single ticker's diff rows as a PrimeVue DataTable; extract this from `TickerHistoryDialog`'s inline table + move matching CSS
**Where**: `src/components/TickerDiffTable.vue` (new) + `src/components/__tests__/TickerDiffTable.spec.ts` (new)
**Depends on**: T1
**Reuses**: `DiffRow` from `@/utils/stockUtils`; DataTable markup from `TickerHistoryDialog.vue:190-207`; diff CSS from `TickerHistoryDialog.vue:244-260`
**Requirement**: DIFF-03, DIFF-04

**Done when**:
- [ ] `TickerDiffTable.vue` renders a `<DataTable data-test-snapshot-diff>` with columns Campo | Anterior | Atual when `rows` is non-empty
- [ ] Atual cell applies `diff-new diff-good` class (green) when `tone === 'good'` and `diff-new diff-bad` (red) when `tone === 'bad'`
- [ ] `data-test-diff-tone` attribute set to the row's `tone` value
- [ ] Arrow rendered inside `.diff-arrow` when `row.arrow` is non-empty
- [ ] Renders nothing (no DataTable) when `rows` is empty
- [ ] No store access, no emits — pure prop-to-render
- [ ] `TickerDiffTable.spec.ts` tests: (a) empty rows → no `[data-test-snapshot-diff]`, (b) non-empty rows → table with correct Campo/Anterior/Atual text, (c) `tone: 'good'` → `.diff-good` class, (d) `tone: 'bad'` → `.diff-bad` class, (e) arrow rendered in `.diff-arrow` span
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: ≥5 new tests pass (new file)

**Tests**: component
**Gate**: quick
**Commit**: `feat(ticker-diff-table): extract diff DataTable into reusable component`

---

### T3: Refactor `TickerHistoryDialog.vue` [P]

**What**: Replace local diff constants + inline diff DataTable with imports from `stockUtils.ts` and `<TickerDiffTable>`; no behaviour change
**Where**: `src/components/TickerHistoryDialog.vue`
**Depends on**: T1, T2
**Reuses**: `buildDiffRows`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION`, `formatBRL`, `DiffRow` from `@/utils/stockUtils`; `TickerDiffTable` from `./TickerDiffTable.vue`
**Requirement**: DIFF-03, DIFF-04

**Done when**:
- [ ] Local `DiffRow` interface removed — imported from `@/utils/stockUtils`
- [ ] `formatBRL`, `FIELD_LABELS`, `FIELD_FORMATTERS`, `FIELD_GOOD_DIRECTION` removed — imported from `@/utils/stockUtils`
- [ ] `diffRows` computed simplified to: guard → `buildDiffRows(history[fromIdx]!, history[toIdx]!)`
- [ ] Inline `<DataTable>` diff block (lines 190-207) replaced with `<TickerDiffTable v-if="diffRows.length > 0" :rows="diffRows" />`
- [ ] `.diff-table`, `.diff-new.*`, `.diff-arrow` CSS removed from `<style scoped>` (now in TickerDiffTable)
- [ ] `.diff-controls`, `.diff-control`, `.diff-divider`, `@media` block **kept** (still used locally)
- [ ] `formatDate`, `HistoryRow`, `SnapshotOption`, `fromIdx`/`toIdx`, `snapshotOptions`, `showPicker`, `historyRows` **unchanged**
- [ ] All 5 existing `TickerHistoryDialog.spec.ts` tests still pass
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: ≥5 tests pass (no regressions)

**Tests**: component
**Gate**: quick
**Commit**: `refactor(ticker-history-dialog): use shared buildDiffRows and TickerDiffTable`

---

### T4: Create `ImportDiffDialog.vue` [P]

**What**: New modal dialog that auto-shows all field-level diffs for tickers updated in the most recent import batch
**Where**: `src/components/ImportDiffDialog.vue` (new) + `src/components/__tests__/ImportDiffDialog.spec.ts` (new)
**Depends on**: T1, T2
**Reuses**: `buildDiffRows`, `DiffRow` from `@/utils/stockUtils`; `TickerDiffTable` from `./TickerDiffTable.vue`; `useIsMobile` from `@/composables/useIsMobile`; PrimeVue `Dialog` pattern from `TickerHistoryDialog.vue`
**Requirement**: DIFF-01, DIFF-02, DIFF-03, DIFF-04, DIFF-05, DIFF-06, DIFF-07

**Done when**:
- [ ] Props: `visible: boolean`, `batchId: string | null`; emits `update:visible`
- [ ] `updatedTickers` computed: `Object.values(tickerStore.tickers).filter(t => t.history.length >= 2 && t.history.at(-1)?.importId === batchId)` — returns `[]` when `batchId` is `null`
- [ ] `diffsByTicker` computed: maps each updated ticker to `{ codigo, rows: buildDiffRows(t.history.at(-2)!, t.history.at(-1)!) }`
- [ ] Template: PrimeVue `Dialog` with `data-test-import-diff-dialog`, header "Atualizações da Importação", `modal`, `maximizable`, responsive width via `useIsMobile`
- [ ] "Sem atualizações" paragraph shown when `diffsByTicker` is empty (DIFF-05, DIFF-06)
- [ ] Ticker sections: `<h3>` with ticker code + `<TickerDiffTable :rows="item.rows" />` per entry (DIFF-02, DIFF-03)
- [ ] `ImportDiffDialog.spec.ts` tests (mount with PrimeVue + Pinia; seed store via `upsertTicker`; matchMedia mock as in TickerHistoryDialog.spec.ts):
  - (a) `batchId: null` → shows "Sem atualizações"
  - (b) batch with only new tickers (history.length === 1) → shows "Sem atualizações"
  - (c) batch with one updated ticker → shows ticker `<h3>` code + `[data-test-snapshot-diff]`
  - (d) batch with two updated tickers → shows two `<h3>` headers
  - (e) closing dialog emits `update:visible` with `false`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: ≥5 new tests pass (new file)

**Tests**: component
**Gate**: quick
**Commit**: `feat(import-diff-dialog): add post-import diff summary modal`

---

### T5: Wire `ImportDiffDialog` into `CsvImport.vue` + add E2E tests

**What**: Connect `ImportDiffDialog` to the import flow so it auto-opens after every successful import; extend `e2e/csvImport.spec.ts` and `CsvImport.spec.ts` to cover the new behaviour
**Where**: `src/components/CsvImport.vue` + `e2e/csvImport.spec.ts` + `src/components/__tests__/CsvImport.spec.ts`
**Depends on**: T3, T4
**Reuses**: existing `lastBatch` ref; `ImportBatch.id` from `@/types/stock`; E2E fixtures at `e2e/fixtures/`
**Requirement**: DIFF-01, DIFF-05, DIFF-06, DIFF-07

**Done when**:
- [ ] `CsvImport.vue` imports `ImportDiffDialog`; adds `diffVisible = ref(false)` and `diffBatchId = ref<string | null>(null)`
- [ ] In `handleFileChange` try-block, after `lastBatch.value = await importStore.importCsv(file)`: sets `diffBatchId.value = lastBatch.value.id` then `diffVisible.value = true`
- [ ] `ImportDiffDialog` NOT opened when import throws (error path skips the two assignments above) — DIFF-07
- [ ] `<ImportDiffDialog v-model:visible="diffVisible" :batchId="diffBatchId" />` added to template
- [ ] `CsvImport.spec.ts` additions: (a) `[data-test-import-diff-dialog]` not present before any import, (b) after mocked successful import `diffVisible` becomes `true` and `diffBatchId` matches batch id
- [ ] `e2e/csvImport.spec.ts` additions:
  - Import `stocks-sample-v1.csv` (first import) → `[data-test-import-diff-dialog]` becomes visible → contains "Sem atualizações"
  - Close dialog → import `stocks-sample-v2.csv` (changed data) → dialog visible → contains at least one ticker heading and `[data-test-snapshot-diff]` row → does NOT contain "Sem atualizações"
- [ ] All 6 existing `CsvImport.spec.ts` tests still pass
- [ ] All 6 existing `e2e/csvImport.spec.ts` tests still pass
- [ ] Gate check passes: `npm run test:unit && npm run test:e2e`
- [ ] Test count: ≥8 unit tests (6 existing + ≥2 new), ≥8 E2E tests (6 existing + ≥2 new)

**Tests**: e2e (+ component)
**Gate**: full
**Commit**: `feat(csv-import): auto-open import diff dialog after successful import`

---

## Pre-Approval Validation

### Check 1: Task Granularity

| Task | Scope | Status |
|------|-------|--------|
| T1: Export diff utilities | 1 util file + 1 test file | ✅ Granular |
| T2: Create TickerDiffTable | 1 new component + 1 new test | ✅ Granular |
| T3: Refactor TickerHistoryDialog | 1 component (pure refactor) | ✅ Granular |
| T4: Create ImportDiffDialog | 1 new component + 1 new test | ✅ Granular |
| T5: Wire + E2E | 1 component mod + E2E + unit additions | ✅ Granular (integration task by design) |

### Check 2: Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|------|----------------------|---------------|--------|
| T1 | None | T1 (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1, T2 | T2 → T3 [P] | ✅ Match |
| T4 | T1, T2 | T2 → T4 [P] | ✅ Match |
| T5 | T3, T4 | T3, T4 → T5 | ✅ Match |
| T3 ↔ T4 | Neither depends on the other | Both branch from T2, no T3↔T4 arrow | ✅ Truly parallel |

### Check 3: Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|------|-----------------------------|-----------------|-----------|--------|
| T1 | `src/utils/stockUtils.ts` | unit | unit | ✅ OK |
| T2 | `src/components/TickerDiffTable.vue` | component | component | ✅ OK |
| T3 | `src/components/TickerHistoryDialog.vue` | component | component | ✅ OK |
| T4 | `src/components/ImportDiffDialog.vue` | component | component | ✅ OK |
| T5 | `src/components/CsvImport.vue` + e2e flow | component + e2e | e2e + component (highest: e2e) | ✅ OK |

All checks pass ✅

---

## Requirement Traceability (updated)

| Requirement ID | Story | Tasks | Status |
|---------------|-------|-------|--------|
| DIFF-01 | Auto-open modal after import | T4, T5 | Pending |
| DIFF-02 | One section per ticker | T4 | Pending |
| DIFF-03 | Diff table per section | T1, T2, T4 | Pending |
| DIFF-04 | Tone coloring + arrows | T1, T2 | Pending |
| DIFF-05 | "Sem atualizações" when no changes | T4, T5 | Pending |
| DIFF-06 | First import counts as no changes | T4, T5 | Pending |
| DIFF-07 | Import error suppresses dialog | T5 | Pending |

**Coverage:** 7 total, 7 mapped ✅
