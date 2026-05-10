# Tech Stack

**Analyzed:** 2026-05-10

## Core

- Framework: Vue 3 (`vue` ^3.5.32)
- Language: TypeScript (`typescript` ~6.0.0, strict via `@vue/tsconfig`)
- Build tool: Vite ^8.0.8 (`vite-plugin-vue-devtools` for DX)
- Type-checker: `vue-tsc` ^3.2.6 (`vue-tsc --build` over project references)
- Runtime: Node `^20.19.0 || >=22.12.0` (pinned to `24.13.0` via `.nvmrc`)
- Package manager: npm (lockfile `package-lock.json`)

## Frontend

- UI Framework: PrimeVue ^4.5.5 + `@primeuix/themes` ^2.0.3 (Aura preset)
- Icon set: `primeicons` ^7.0.0
- Styling: Plain scoped CSS in `<style scoped>` blocks. **PrimeFlex is NOT installed** — utility classes like `flex gap-2` are forbidden; use scoped CSS / `:deep()` instead (see `CLAUDE.md`).
- Routing: `vue-router` ^5.0.4 (single route `/` → `HomeView`)
- State Management: Pinia ^3.0.4 + `pinia-plugin-persistedstate` ^4.7.1 (every store has `persist: true` and stores into `localStorage`)
- Form Handling: native PrimeVue inputs (`InputText`, `InputNumber`, `Select`, `Password`, `MultiSelect`); no form library
- Diff utility: `microdiff` ^1.5.0 (used in `stockUtils.getDiff` for snapshot history diffs)

## Backend

None. This is a 100% client-side SPA. There is no server, no auth, and no database — all state lives in `localStorage` via Pinia persistence.

## Testing

- Unit / component: Vitest ^4.1.4 + `@vue/test-utils` ^2.4.6, `jsdom` ^29.0.2 environment
- E2E: Playwright ^1.59.1 (chromium project only; mobile/branded browsers commented out in `playwright.config.ts`)
- Lint stack: `oxlint` ~1.60.0 (fast pre-pass, `correctness: error`) followed by `eslint` ^10.2.1 with `eslint-plugin-vue` ~10.8.0, `eslint-plugin-playwright` ^2.10.1, `@vitest/eslint-plugin` ^1.6.16, `eslint-plugin-oxlint`, and `eslint-config-prettier` (formatting concerns deferred to Prettier)
- Formatter: Prettier 3.8.3 (`semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'all'`, `printWidth: 100`)
- Coverage tool: none configured

## External Services

- Live quotes: `https://brapi.dev/api/quote/{codigo}` — Brazilian stock quotes API (free tier; one ticker per request)

## Development Tools

- Task runner: `npm-run-all2` ^8.0.4 (`run-p`, `run-s` in `package.json` scripts)
- Editor config: `.editorconfig` (LF, 2-space indent, max line 100), `.vscode/`
- Path alias: `@` → `./src` (configured in both `vite.config.ts` and `tsconfig.app.json`)
- TS project references: `tsconfig.json` references `tsconfig.app.json` (app source), `tsconfig.node.json` (build configs), `tsconfig.vitest.json` (unit tests). `noUncheckedIndexedAccess: true` is enabled in `tsconfig.app.json`.
- CI: GitHub Actions — `.github/workflows/ci.yml` runs lint → type-check → format:check → test:unit → build → test:e2e on push to `master` and on PRs.
