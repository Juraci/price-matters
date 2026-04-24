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
                              └─ tickerStore.upsertTicker()
```

- **`src/utils/csvParser.ts`**: Parses the proprietary CSV format. The header row is detected by searching for a line starting with `"Empresa"`. Columns are mapped by fixed index positions.
- **`src/utils/stockUtils.ts`**: Contains `snapshotsDiffer()`, which defines which fields constitute a meaningful change (controls whether importing the same CSV again creates a new snapshot or is treated as "unchanged"). Also contains `slugify()` used as the empresa key.
- **`src/types/stock.ts`**: All shared types (`Ticker`, `Empresa`, `ImportBatch`, `TickerSnapshot`, `ParsedCsvRow`).

### Stores (Pinia, all with `persist: true`)

All three stores must be reset together — `importStore.reset()`, `empresaStore.reset()`, `tickerStore.reset()`.

- **`tickerStore`**: Primary store. Keyed by ticker code (`Record<string, Ticker>`). Each `Ticker` holds a `history: TickerSnapshot[]`. `upsertTicker` returns `'new' | 'updated' | 'unchanged'`. `markRemovedIfNotIn()` sets status to `'removed'` for tickers absent from the latest import.
- **`empresaStore`**: Tracks companies (`Empresa`) and their associated ticker codes. Keyed by slugified company name.
- **`importStore`**: Records import batches with stats. Orchestrates the CSV import pipeline.

### UI (PrimeVue 4 + Aura theme)

PrimeVue is the only UI library. **PrimeFlex is not installed** — do not use PrimeFlex utility classes (`flex`, `gap-2`, `align-items-center`, etc.). Use scoped CSS in `<style scoped>` blocks instead. For styles targeting PrimeVue-generated elements (e.g., DataTable rows), use `:deep()`.

### Testing conventions

- **Unit tests** (Vitest): use `mount` (not `shallowMount`). Component tests require `PrimeVue` and an active Pinia in `global.plugins`.
- **E2E tests** (Playwright): use `page.locator` with `data-testid` attributes. The dev server is started automatically by Playwright. `setInputFiles` works on hidden file inputs without `{ force: true }`.
