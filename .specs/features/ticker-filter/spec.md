# Ticker Filter Specification

## Problem Statement

Users typically follow a small watchlist (a handful of codigos), but every CSV import keeps adding tickers — over time the table fills with noise and "Atualizar cotações" hits brapi for every imported codigo, burning free-tier quota on tickers the user no longer cares about. There is no way today to narrow the visible set or the live-quote fan-out without re-importing a hand-edited CSV.

## Goals

- [ ] Persist a user-defined comma-separated codigo allowlist that narrows the table view AND the live-quote fetch list.
- [ ] Validate the saved filter against imported tickers and surface unknown codigos inline in `SettingsPopover` so typos are visible immediately.

## Out of Scope

| Feature                                         | Reason                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Wildcards / patterns (`KLBN*`, `ITUB?`)         | Adds parsing complexity; the watchlist size is small enough that explicit codigos suffice.                              |
| Multiple saved filters / presets                | One persisted filter covers the stated need. Multi-preset is a separate feature.                                        |
| Per-empresa or per-setor filtering              | The DataTable already exposes per-column filters (`empresaNome`, `atuacao`); this feature is strictly codigo-based.     |
| Auto-completion / chip input                    | Plain text input is sufficient for short lists. A chip widget would balloon the design surface.                         |
| Hiding the filter from the column-toggle list   | Column toggles operate on already-narrowed rows. Out of scope for this slice.                                            |
| Re-implementing the existing per-column filters | The store-level filter narrows the input to PrimeVue; column filters continue to work on top, unchanged.                 |

---

## User Stories

### P1: Apply persisted ticker filter ⭐ MVP

**User Story**: As an investor following a specific watchlist, I want to enter a comma-separated list of ticker codes in Settings and have only those tickers shown in the table and fetched from brapi, so I don't waste attention or brapi quota on tickers I don't track.

**Why P1**: Core feature; the validation in P1.b is meaningless without the apply path.

**Acceptance Criteria**:

1. WHEN the user enters `KLBN4, ITUB3` in the SettingsPopover ticker-filter field and clicks Salvar, THEN the system SHALL parse the input by splitting on `,`, trimming whitespace, uppercasing each entry, dropping empty entries, deduping, and persisting the resulting `string[]` into `configStore.tickerFilter` (via `setTickerFilter`).
2. WHEN `configStore.tickerFilter` is non-empty, THEN `tickerStore` SHALL expose a new computed (e.g. `filteredTickers`) that yields only tickers whose `codigo` is in the filter set, and `StockDataTable.tableRows` SHALL be derived from that computed.
3. WHEN `configStore.tickerFilter` is empty, THEN `filteredTickers` SHALL equal `allTickers` (current behavior preserved exactly).
4. WHEN the user clicks "Atualizar cotações" with a non-empty filter, THEN `useLiveQuotes.refresh` SHALL request brapi only for codigos in the filter set.
5. WHEN the user clicks "Atualizar cotações" with an empty filter, THEN `useLiveQuotes.refresh` SHALL request quotes for every imported codigo (current behavior preserved exactly).
6. WHEN the page is reloaded after saving a filter, THEN the saved filter SHALL still apply (persisted via `pinia-plugin-persistedstate` — `configStore` already has `persist: true`).
7. WHEN the user clicks "Limpar dados" (the data-reset button in `CsvImport.vue`), THEN `configStore.tickerFilter` SHALL survive the reset, consistent with the existing `configStore`-survives-data-wipe convention.
8. WHEN a ticker in the filter has `status='removed'` AND was previously imported, THEN it SHALL still appear in the table (filter is independent of status; the existing `removed-row` opacity styling still applies).
9. WHEN a codigo exists in the persisted filter but is NOT in the imported tickers (e.g. user imported a smaller CSV later), THEN it SHALL silently not appear in the table — no error here; validation lives in the SettingsPopover save flow (P1.b).

**Independent Test**: Import `stocks-sample-v1.csv`, save filter `KLBN4, ITUB3` via SettingsPopover, verify only those two rows render. Click "Atualizar cotações" with brapi mocked at `**/api/quote/**`; verify the mock receives requests only for `KLBN4` and `ITUB3` (and that `BBSE3`, `LEVE3`, etc. are NOT requested).

---

### P1: Validate filter against imported tickers ⭐ MVP

**User Story**: As an investor entering a watchlist, I want to know immediately if I typed a codigo that isn't in my imported data, so I can fix typos before relying on the filter.

**Why P1**: A silent filter that hides typos is worse than no filter — the user wouldn't know whether `XXX3` is missing because it's not in the data or because the filter is broken.

**Acceptance Criteria**:

1. WHEN the user clicks Salvar with a filter containing one or more codigos that do not exist in `tickerStore.tickers`, THEN the SettingsPopover SHALL display a single inline red message immediately below the filter field listing every missing codigo: `"Tickers não encontrados: XXX3, YYY4"`.
2. WHEN the save attempt contains both matching and non-matching codigos, THEN the matching codigos SHALL still be persisted and applied (best-effort save), the non-matching codigos SHALL be persisted alongside (preserving the user's stated intent so a later CSV import containing those codigos starts including them automatically), and the red message SHALL list only the currently-non-matching codigos.
3. WHEN the user edits the field and clicks Salvar again with all codigos resolving, THEN the red message SHALL disappear and the filter SHALL be persisted as the new value.
4. WHEN the user clicks Limpar in the SettingsPopover, THEN both `brapiApiKey` (existing behavior) AND the locally-staged ticker-filter input SHALL be cleared, the persisted `configStore.tickerFilter` SHALL be set to `[]`, and any visible "not found" message SHALL be hidden.
5. WHEN the popover/drawer is opened, THEN the input field SHALL be pre-populated with the currently-persisted filter rendered as `KLBN4, ITUB3` (joined by `", "`), so the user can edit rather than re-type.
6. WHEN no CSV has been imported yet AND the user saves any non-empty filter, THEN the message SHALL list every codigo in the filter as not-found (since `tickerStore.tickers` is `{}`), and the filter SHALL still be persisted (P1.b AC #2 generalisation).
7. WHEN the input value does NOT conform to the strict ticker format (each entry must match `^[a-zA-Z]{4}[0-9]{1,2}$`, separated by `,` only, no trailing/leading/repeated commas) AND the input field loses focus (`blur`), THEN the SettingsPopover SHALL display a red message `"Formato inválido"` below the field.
8. WHEN the user clicks Salvar with format-invalid input, THEN the system SHALL NOT modify `configStore.tickerFilter` (no-op), SHALL NOT close the popover/drawer, AND SHALL display the `"Formato inválido"` message regardless of whether blur fired.
9. WHEN the user edits the field after a format error was shown, THEN the format error message SHALL be cleared on the next `input` event (live feedback while the user fixes their typo).
10. WHEN the user clicks Salvar with format-valid input after a prior format-invalid attempt, THEN the existing save flow SHALL proceed normally (including the missing-codigos validation in AC #1).

**Independent Test**: Import `stocks-sample-v1.csv`, open SettingsPopover, enter `XXX3, ITUB3`, click Salvar. Assert a red message reading `Tickers não encontrados: XXX3` appears under the field and `ITUB3` is the only row visible in the table afterwards.

**Format validation rules (strict, for AC #7-#10):**
- Empty input (or whitespace-only) is valid — clears the filter.
- Each entry, after trim, MUST match `^[a-zA-Z]{4}[0-9]{1,2}$` (case-insensitive; uppercased on save).
- The ONLY allowed separator is `,`. Semicolons, spaces-as-separator, etc. are rejected.
- Trailing/leading/repeated commas (which produce empty pieces) are rejected.
- The `parseTickerFilterInput` helper remains forgiving (drops empty pieces, dedupes) for any non-UI callers; the strict validator is a separate gate used only by `SettingsPopover.save` and `SettingsPopover.validateFormat` (on blur).

---

## Edge Cases

- WHEN the input contains duplicate codigos (`KLBN4, klbn4, KLBN4`), THEN the system SHALL dedupe after uppercasing to a single `["KLBN4"]`.
- WHEN the input contains only whitespace and/or commas (`  ,  ,`), THEN the system SHALL treat the filter as empty (`[]`) and clear any prior filter.
- WHEN the input contains entries with leading/trailing whitespace (`  KLBN4  ,ITUB3`), THEN the system SHALL trim each entry before uppercasing/deduping.
- WHEN the input is lowercase or mixed-case (`klbn4, Itub3`), THEN the system SHALL uppercase each entry on save (per case-handling decision in spec discussion).
- WHEN the user opens the SettingsPopover but does NOT click Salvar, THEN the persisted filter SHALL remain unchanged (the field is staged input until Salvar).
- WHEN the field contains text but the user closes the popover/drawer without saving, THEN the staged input SHALL be discarded (re-opening shows the persisted value, not the abandoned text).
- WHEN the persisted filter contains a codigo that the data-reset wipe would have invalidated (because all tickers were just cleared), THEN the next CSV import SHALL re-activate filtering as soon as a matching codigo is upserted.
- WHEN the filter narrows to zero rows (every code in the filter is missing or unimported), THEN the table SHALL show the existing "Nenhum dado importado" empty-state message (acceptable — the user just needs to fix the filter or import data).

---

## Requirement Traceability

| Requirement ID | Story                          | Phase | Status  |
| -------------- | ------------------------------ | ----- | ------- |
| FILT-01        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-02        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-03        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-04        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-05        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-06        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-07        | P1: Apply persisted filter     | Execute | ✅ Verified (manual: configStore has no reset action; survives by construction) |
| FILT-08        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-09        | P1: Apply persisted filter     | Execute | ✅ Verified |
| FILT-10        | P1: Validate filter            | Execute | ✅ Verified |
| FILT-11        | P1: Validate filter            | Execute | ✅ Verified |
| FILT-12        | P1: Validate filter            | Execute | ✅ Verified |
| FILT-13        | P1: Validate filter            | Execute | ✅ Verified |
| FILT-14        | P1: Validate filter            | Execute | ✅ Verified |
| FILT-15        | P1: Validate filter            | Execute | ✅ Verified (covered by Step 4 component test "shows red error..." which exercises the same code path with empty store) |
| FILT-16        | P1: Validate filter (format)   | Execute | ✅ Verified |
| FILT-17        | P1: Validate filter (format)   | Execute | ✅ Verified |
| FILT-18        | P1: Validate filter (format)   | Execute | ✅ Verified |
| FILT-19        | P1: Validate filter (format)   | Execute | ✅ Verified |

**ID format:** `FILT-NN`
**Status values:** Pending → In Tasks → Implementing → Verified
**Coverage:** 15 total, 0 mapped to tasks (Tasks phase optional for Medium scope — see Implementation Sketch below).

The numbering corresponds to the ACs in order: FILT-01..09 = P1 (apply) ACs 1..9; FILT-10..15 = P1 (validate) ACs 1..6.

---

## Implementation Sketch (informational — not Tasks)

Tasks phase is being skipped (Medium scope, ≤5 obvious steps). If the steps below grow during execution, escalate to a formal `tasks.md` per the skill's safety valve.

1. **`configStore`** — add `tickerFilter: string[]`, `setTickerFilter(codigos: string[])`, `parseTickerFilterInput(raw: string): string[]` (split/trim/uppercase/dedupe/drop-empty), and `isTickerFilterActive` computed. Filter survives `reset()` (already the case — no `reset()` exists on configStore).
2. **`tickerStore`** — add a `filteredTickers` computed that uses `useConfigStore().tickerFilter`. When filter is empty, return `allTickers` reference unchanged. Add a `filteredCodigos` computed for the live-quote layer.
3. **`StockDataTable.vue`** — change `tableRows` to iterate `tickerStore.filteredTickers` instead of `tickerStore.allTickers`. Per-column DataTable filters operate on the narrowed input transparently.
4. **`useLiveQuotes.ts`** — change `const codigos = tickerStore.allTickers.map((t) => t.codigo)` to read `tickerStore.filteredCodigos`. The `codigos.length === 0` guard already covers "filter narrows to zero".
5. **`SettingsPopover.vue`** — add a second labelled field below the brapi key:
   - `InputText` (not `Password`) with `data-testid="settings-ticker-filter"`.
   - On open, hydrate from `parseTickerFilterInput(configStore.tickerFilter.join(', '))` (round-trip through the parser).
   - On Salvar: parse input, compute missing codigos by checking against `tickerStore.tickers`, persist via `configStore.setTickerFilter`, render the missing-codigos message via PrimeVue `<Message>` (or a styled `<small>`), `data-testid="settings-ticker-filter-error"`.
   - On Limpar: clear staged input + call `configStore.setTickerFilter([])` + hide message (extends the existing Limpar handler).
6. **Tests**:
   - Unit (`configStore.spec.ts`): `parseTickerFilterInput` happy path, dedup, whitespace, empty, mixed-case (FILT-01, edge cases).
   - Unit (`tickerStore.spec.ts`): `filteredTickers` empty-filter passthrough (FILT-03), populated-filter narrowing (FILT-02), removed-status passthrough (FILT-08), unknown-codigo silent drop (FILT-09).
   - Unit (`useLiveQuotes.spec.ts`): asserts `fetchQuotes` is called with the filtered codigo set when filter active (FILT-04) and the full set when empty (FILT-05).
   - Component (`SettingsPopover.spec.ts`): missing-codigo message rendered (FILT-10, FILT-11), message clears on successful save (FILT-12), Limpar resets (FILT-13), pre-population on open (FILT-14).
   - E2E happy path (`e2e/tickerFilter.spec.ts`): mirror the user's "Happy path" Gherkin — import `stocks-sample-v1.csv`, save `KLBN4, ITUB3`, assert only those rows visible, click refresh with mocked brapi, assert only `KLBN4` and `ITUB3` requests reach the mock (use a `Set` populated inside `page.route` and assert size + members).
   - E2E missing-ticker (`e2e/tickerFilter.spec.ts`): import `stocks-sample-v1.csv`, save `XXX3, ITUB3`, assert the red message `Tickers não encontrados: XXX3` is visible under the field and `ITUB3` is the only data row.

---

## Success Criteria

- [ ] Saving a 2-codigo filter narrows the table from N rows to exactly 2 rows in <100ms (no perceptible lag).
- [ ] With a 2-codigo filter active, "Atualizar cotações" issues exactly 2 requests to brapi (verified via Playwright HTTP mock counter).
- [ ] Saving a filter containing 1 invalid + 1 valid codigo shows the red "não encontrados" message AND applies the valid codigo (best-effort save preserved).
- [ ] All 15 ACs (FILT-01..FILT-15) covered by either unit, component, or E2E tests; CI gate (`npm run lint && npm run type-check && npm run format:check && npm run test:unit && npm run build && npm run test:e2e`) is green before merge.
- [ ] No regression in existing E2E suites (`csvImport.spec.ts`, `liveQuotes.spec.ts`, `columnToggle.spec.ts`, `settings.spec.ts`, `sortFilterPersistence.spec.ts`).
