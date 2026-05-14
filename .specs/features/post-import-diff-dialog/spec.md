# Post-Import Diff Dialog Specification

## Problem Statement

After importing a CSV, the user sees only aggregate counts ("3 atualizados") with no field-level detail. To evaluate the quality of the data update, they must click into each ticker's history individually. This feature surfaces all changes in a single modal immediately after import, so the user can assess the full diff at a glance without navigating away.

## Goals

- [ ] Auto-show a modal after every CSV import summarising field-level changes across all updated tickers
- [ ] Present zero-configuration: dialog opens automatically, no extra click needed
- [ ] Reuse the exact diff table style already established in TickerHistoryDialog

## Out of Scope

| Feature | Reason |
|---------|--------|
| Showing diffs for brand-new tickers | No "before" snapshot exists; not a diff |
| Showing removed tickers in the diff | No "after" snapshot exists; not a diff |
| Persisting the diff view between sessions | Ephemeral post-import feedback only |
| Snapshot picker (choose which two to compare) | Always compares the last two — no user selection needed here |
| Full import history table per ticker | Available in TickerHistoryDialog; out of scope for this summary view |

---

## User Stories

### P1: Post-Import Diff with Changes ⭐ MVP

**User Story**: As an investor, I want to see what data changed after importing a CSV so that I can quickly assess whether the update is meaningful.

**Why P1**: Core purpose of the feature.

**Acceptance Criteria**:

1. WHEN a CSV import completes successfully AND at least one existing ticker's volatile data changed THEN the system SHALL automatically open a modal dialog titled "Atualizações da Importação"
2. WHEN the dialog opens THEN it SHALL display one section per updated ticker, headed by the ticker code (e.g. `ITUB3`)
3. WHEN a ticker section is rendered THEN it SHALL show a diff table with columns Campo | Anterior | Atual for each changed volatile field
4. WHEN a field value increased and the increase is favorable THEN the "Atual" cell SHALL render in green with a ↑ arrow
5. WHEN a field value increased and the increase is unfavorable THEN the "Atual" cell SHALL render in red with a ↑ arrow
6. WHEN a field value decreased and the decrease is favorable THEN the "Atual" cell SHALL render in green with a ↓ arrow
7. WHEN a field value decreased and the decrease is unfavorable THEN the "Atual" cell SHALL render in red with a ↓ arrow
8. WHEN the user closes the dialog THEN the system SHALL dismiss it without affecting any other UI state

**Independent Test**: Import two CSVs where ITUB3.precoTeto changes from 30 → 31 and KLBN4.cagrLucros5Anos changes from 10 → 12. Dialog should open with two sections, each showing the changed field with green/↑ coloring.

---

### P1: Post-Import Diff with No Changes ⭐ MVP

**User Story**: As an investor, I want feedback confirming that nothing changed in the latest import so that I'm confident the data is current.

**Why P1**: Part of the same auto-open behaviour; both scenarios must be handled.

**Acceptance Criteria**:

1. WHEN a CSV import completes successfully AND no existing ticker's volatile data changed THEN the system SHALL automatically open the modal dialog
2. WHEN the dialog opens with no changes THEN it SHALL display the message "Sem atualizações" instead of ticker sections
3. WHEN this is the very first import (no prior data) THEN the system SHALL show "Sem atualizações" (all tickers are new, none are updated)

**Independent Test**: Import the same CSV twice. On the second import, dialog opens with "Sem atualizações".

---

## Edge Cases

- WHEN a ticker has exactly two snapshots (first update ever) THEN it SHALL appear in the diff dialog normally — this is the minimum valid diff state
- WHEN the user imports a CSV that fails with an error THEN the dialog SHALL NOT open
- WHEN the dialog is open and the user triggers another import (edge case — not currently possible in the UI) THEN the dialog SHALL close and reopen with the new batch's diffs

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| DIFF-01 | P1: Diff with changes — auto-open modal | Implemented | Done |
| DIFF-02 | P1: Diff with changes — one section per ticker | Implemented | Done |
| DIFF-03 | P1: Diff with changes — diff table per section | Implemented | Done |
| DIFF-04 | P1: Diff with changes — tone coloring + arrows | Implemented | Done |
| DIFF-05 | P1: No changes — auto-open with "Sem atualizações" | Implemented | Done |
| DIFF-06 | P1: No changes — first import counts as no changes | Implemented | Done |
| DIFF-07 | Edge — import error suppresses dialog | Implemented | Done |

**Coverage:** 7 total, 7 implemented ✅

---

## Success Criteria

- [x] Dialog opens automatically after every successful CSV import (no extra user action)
- [x] Every changed volatile field appears in the diff with correct label, formatted before/after values, and correct tone coloring
- [x] "Sem atualizações" is shown when nothing changed (including first-ever import)
- [x] Closing the dialog leaves all other UI state unchanged
- [x] Existing TickerHistoryDialog unit tests still pass (refactor must not regress)
