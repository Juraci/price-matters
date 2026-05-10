# Testing Infrastructure

## Test Frameworks

- **Unit / Component:** Vitest ^4.1.4 + `@vue/test-utils` ^2.4.6 (jsdom ^29 environment).
- **E2E:** Playwright ^1.59.1 (chromium project only; mobile/branded browsers commented out in `playwright.config.ts`).
- **Coverage:** None configured. No `vitest --coverage` script; no coverage tool installed.

## Test Organization

**Location:**
- Unit / component tests live in `__tests__/` folders **colocated** with the source they exercise: `src/utils/__tests__/`, `src/stores/__tests__/`, `src/components/__tests__/`, `src/composables/__tests__/`.
- E2E tests live in `/e2e/` at the repo root (with shared fixtures in `/e2e/fixtures/`).

**Naming:** Every spec file is named `<sourceBasename>.spec.ts`. Example: `csvParser.ts` → `csvParser.spec.ts`.

**Structure:** Top-level `describe('<unitUnderTest>', () => { ... })` block per file, with `beforeEach` setting up Pinia (`setActivePinia(createPinia())`). One assertion per `it(...)` is the dominant style — most tests are short and read top-to-bottom.

## Testing Patterns

### Unit tests

**Approach:** Pure-function tests with no mounting, no Vue, no Pinia. Each `it` block constructs the input, calls the function, asserts the output.

**Location:** `src/utils/__tests__/csvParser.spec.ts`, `src/utils/__tests__/stockUtils.spec.ts`.

**Pattern:**
```ts
import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csvParser';

describe('parseCsv', () => {
  it('parses BR currency format (lucro líquido estimado)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z');
    expect(rows[0]!.snapshot.lucroLiquidoEstimado).toBe(100000);
  });
});
```

### Store tests

**Approach:** Instantiate the store inside a fresh Pinia, mutate via the store's public surface, assert state. No mounting needed.

**Location:** `src/stores/__tests__/*.spec.ts`.

**Pattern:**
```ts
import { setActivePinia, createPinia } from 'pinia';
import { useTickerStore } from '../tickerStore';

beforeEach(() => { setActivePinia(createPinia()); });

it('returns "updated" and adds snapshot when precoTeto changes', () => {
  const store = useTickerStore();
  store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 12 }), 10);
  const result = store.upsertTicker('TEST3', 'TestCo',
    makeSnapshot({ precoTeto: 14, importId: 'import-2' }), 10);
  expect(result).toBe('updated');
  expect(store.allTickers[0]!.history).toHaveLength(2);
});
```

A reusable `makeSnapshot(overrides)` helper is duplicated across multiple spec files (intentional — keeps each spec independent).

### Component tests

**Approach:** `mount` (not `shallowMount`) so PrimeVue's actual DOM renders. Plugins required: the active Pinia and PrimeVue with the Aura preset.

**Location:** `src/components/__tests__/*.spec.ts`.

**Pattern:**
```ts
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

function mountComponent() {
  return mount(StockDataTable, {
    global: { plugins: [getActivePinia()!, [PrimeVue, { theme: { preset: Aura } }]] },
  });
}
```

Component tests reach into stores directly to seed state (`useTickerStore().upsertTicker(...)`) before mounting, then assert on rendered text or — for binding tests — on `findComponent(DataTable).props(...)`.

### Composable tests

**Approach:** Composables that use lifecycle hooks (`onMounted`, etc.) cannot be called bare in a test. Wrap them in a host component that calls the composable inside `setup` and `expose()`s the returned API; mount the host and read `wrapper.vm` as the API.

**Location:** `src/composables/__tests__/useLiveQuotes.spec.ts`.

**Pattern:**
```ts
function mountHost(): HostExposed {
  const Host = defineComponent({
    setup(_, { expose }) {
      const api = useLiveQuotes();
      expose(api);
      return () => h('div');
    },
  });
  const wrapper = mount(Host, { global: { plugins: [getActivePinia()!] } });
  return wrapper.vm as unknown as HostExposed;
}
```

External services are mocked at the module boundary with `vi.mock('@/services/brapiClient', ...)`.

### E2E tests

**Approach:** Black-box browser tests through Playwright's test runner. Tests start at `/`, clear `localStorage`, reload, then drive the UI through `data-testid` / `data-test-*` locators.

**Location:** `/e2e/*.spec.ts`.

**Pattern:**
```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('import-button')).toBeVisible();
});
```

**Key conventions:**
- Locators use **`data-testid`** (preferred) or `data-test-*` for behaviour-oriented hooks (`data-test-upload-csv`, `data-test-history-button`, `data-test-snapshot-history`, `data-test-snapshot-diff`, `data-test-diff-from`, `data-test-diff-to`, `data-test-diff-tone`). Never select on `.p-...` PrimeVue classes for behaviour assertions; only for shape assertions (e.g. `dialog.locator('.p-datatable-tbody tr')`).
- File uploads target the hidden `<input>` directly: `page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH)` works without `{ force: true }`.
- For live-quote tests, **mock brapi at the HTTP layer** via `page.route('**/api/quote/**', ...)`. The mock reads the symbol from `route.request().url()` and returns a single-result body keyed to that symbol — the client hits the endpoint once per ticker.
- `route.fulfill({ body: ... })` requires a **string** body (`JSON.stringify(...)`); object literals silently break.
- The brapi key is seeded into `configStore` for E2E runs by writing `localStorage.setItem('config', JSON.stringify({ brapiApiKey: 'test-key' }))` via `page.addInitScript` before navigation.

## Test Execution

**Commands:**
- `npm run test:unit` — `vitest run` (one-off; no watch).
- `npm run test:e2e` — `playwright test` (auto-starts Vite dev server on port 5173 / preview on 4173 in CI).
- `npm run test:e2e:headed` — same with a visible browser.
- `npx vitest run src/components/__tests__/CsvImport.spec.ts` — single Vitest file.
- `npm run test:e2e -- e2e/csvImport.spec.ts` — single Playwright file.
- `npm run test:e2e -- --debug` — Playwright debug mode.
- `npm run test:e2e -- --project=chromium` — same as default; the only configured project.

**Configuration:**
- `vitest.config.ts` extends `vite.config.ts` (so the `@/` alias works), sets `environment: 'jsdom'`, excludes `e2e/**`.
- `playwright.config.ts` sets `testDir: './e2e'`, `timeout: 30000`, `expect.timeout: 5000`. CI behavior: `forbidOnly`, `retries: 2`, `workers: 1`, uses `npm run preview` on port 4173 instead of the dev server.

## Coverage Targets

**Current:** No coverage tooling configured — there is no measured baseline.
**Goals:** Not documented.
**Enforcement:** None (CI does not enforce coverage).

## Test Coverage Matrix

Sampled by walking `src/` and matching to `__tests__` and `e2e/`:

| Code Layer                          | Required Test Type | Location Pattern                            | Run Command                            |
| ----------------------------------- | ------------------ | ------------------------------------------- | -------------------------------------- |
| `src/utils/*.ts`                    | unit               | `src/utils/__tests__/*.spec.ts`             | `npm run test:unit`                    |
| `src/stores/*.ts`                   | unit (store)       | `src/stores/__tests__/*.spec.ts`            | `npm run test:unit`                    |
| `src/composables/*.ts`              | unit (host-mount)  | `src/composables/__tests__/*.spec.ts`       | `npm run test:unit`                    |
| `src/components/*.vue`              | component          | `src/components/__tests__/*.spec.ts`        | `npm run test:unit`                    |
| `src/services/brapiClient.ts`       | none (currently)   | —                                           | (covered indirectly via E2E mocks)     |
| `src/views/*.vue`, `src/router/`    | none (currently)   | —                                           | covered indirectly via E2E             |
| End-to-end user flows               | e2e                | `e2e/*.spec.ts`                             | `npm run test:e2e`                     |

Layers without dedicated tests (`services/brapiClient.ts`, `views/HomeView.vue`, `router/index.ts`) are flagged in `CONCERNS.md`.

## Parallelism Assessment

| Test Type | Parallel-Safe?                           | Isolation Model                                                                                                                                                                                                                                              | Evidence                                                                  |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| Vitest    | Yes (file-level — Vitest default)        | Each spec file gets its own jsdom instance; `setActivePinia(createPinia())` in `beforeEach` gives each test an isolated store; no shared filesystem or DB; `vi.mock` is module-scoped per file.                                                              | All `__tests__/*.spec.ts` files use `beforeEach(setActivePinia(createPinia()))`; no test reaches into a shared global. |
| Playwright| Yes locally, **No on CI** (`workers: 1`) | Each test gets a fresh `page` and clears `localStorage` in `beforeEach`. CI forces `workers: 1` because the single `webServer` instance serves all tests and parallel imports could race the in-memory app state across tabs.                                | `playwright.config.ts:29` — `workers: process.env.CI ? 1 : undefined`.    |

## Gate Check Commands

| Gate Level | When to Use                                         | Command                                                                              |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Quick      | After tasks that touch only utils / stores / composables / components | `npm run test:unit`                                                                  |
| Full       | After tasks that touch user-facing UI flows or live-quote logic       | `npm run test:unit && npm run test:e2e`                                              |
| Build      | After phase completion or before opening a PR       | `npm run lint && npm run type-check && npm run format:check && npm run test:unit && npm run build && npm run test:e2e` |

(The Build sequence mirrors `.github/workflows/ci.yml`. Running it locally before pushing reproduces CI exactly.)
