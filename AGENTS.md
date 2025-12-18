# Repository Guidelines

## Project Structure & Module Organization

- `src/`: SolidJS + TypeScript app code.
  - `src/main.tsx`: app entry.
  - `src/pages/`: route-level screens (folders map to URL segments).
  - `src/components/`: reusable UI components.
  - `src/hooks/`: shared hooks/primitives.
  - `src/store/`: global state stores.
  - `src/utils/`: API/client helpers and utilities.
  - `src/types/`: shared TypeScript types.
  - `src/lang/`: i18n bundles (often updated/extracted during builds).
- `public/`: static assets served as-is.
- `scripts/`: small repo scripts (for example `scripts/i18n.mjs`).
- `images/`: repository images used in docs/README.
- `.github/`: CI workflows and PR template.
- `build.sh`: release/dev build pipeline used by CI.

## Build, Test, and Development Commands

This repo uses `pnpm` (see `packageManager` in `package.json`). CI uses Node 22.

- `pnpm install`: install dependencies.
- `pnpm dev`: start Vite dev server (forces rebuild). `/api` is proxied to `http://localhost:5244` (run the backend locally).
- `pnpm build`: production build to `dist/`.
- `pnpm build:lite`: lite build (`VITE_LITE=true`) that skips copying heavy static deps.
- `pnpm serve`: preview the built `dist/`.
- `pnpm format`: run Prettier (also enforced via Husky + `lint-staged`).
- `./build.sh --dev --no-compress --skip-i18n`: CI-like build. Note: dev builds rewrite `package.json` version based on git tags/commit.

## Coding Style & Naming Conventions

- Use TypeScript (`strict: true`) and SolidJS `.tsx`; prefer the `~/...` import alias for `src/`.
- Formatting is Prettier-driven (`.prettierrc`, 2-space indent, no semicolons). Run `pnpm format`; pre-commit runs `lint-staged`.
- Naming patterns in this repo: `PascalCase.tsx` for components, lowercase route folders under `src/pages/`, and utilities commonly `snake_case.ts`.

## Configuration & Security

- Vite env files live in `.env.development` and `.env.production`. Only `VITE_*` vars are exposed to the client; don’t commit secrets.
- `build.sh` may download `i18n.tar.gz` from GitHub releases; set `GITHUB_TOKEN`/`GH_TOKEN` if you hit API rate limits, or use `--skip-i18n`.

## Testing Guidelines

There is no dedicated unit test runner configured. Validate changes by:

- Running `pnpm dev` and smoke-testing affected screens/flows.
- Running `pnpm build` (and `pnpm serve` if the change is build/runtime sensitive).

## Commit & Pull Request Guidelines

- Prefer Conventional Commits (used in history and required for PR titles): `feat|fix|docs|style|refactor|chore` with optional scope (e.g. `fix(editor): ...`). Use `[skip ci]` for formatting-only commits.
- PRs should follow `.github/PULL_REQUEST_TEMPLATE.md`: clear description, linked issues (`Closes #123`), and explicit “How Has This Been Tested” steps. Include screenshots/GIFs for UI changes.
