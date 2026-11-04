# Repository Guidelines

## Project Structure & Module Organization

The app is a React 19 and TypeScript site built with Vite. Application code lives in `src/`: route-level views are in `src/pages`, reusable UI in `src/components`, domain logic in `src/lib`, static content in `src/data`, and localization in `src/i18n`. Place public, directly served assets in `public/`; source documentation and booth templates are in `docs/`. Database changes belong in `supabase/migrations/`, build and asset utilities in `scripts/`, and automated checks in `tests/`. The standalone outreach utility is under `outreach/`.

## Build, Test, and Development Commands

Use Node.js 20.19 or newer and install dependencies with `npm ci`.

- `npm run dev` starts the local Vite server.
- `npm run build` type-checks and builds the site, then prerenders pages.
- `npm run preview` serves the production build locally.
- `npm run typecheck` runs the TypeScript project checks.
- `npm run test:map`, `npm run test:booth`, and other `test:*` scripts run focused Node checks; `npm run test:e2e` runs browser end-to-end checks.
- `npm run validate:models` checks included 3D model assets.

Run the relevant focused checks after changing a feature; use `npm run build` for broader validation. There is no separate lint or formatter script configured.

## Coding Style & Naming Conventions

Follow nearby code conventions: two-space indentation, semicolons, single-quoted strings in TypeScript/JavaScript, and functional React components. Use PascalCase for component and page files (for example, `ProjectCard.tsx`), camelCase for utilities and data modules, and descriptive kebab-case names for public assets. Keep feature logic in `src/lib` and presentational components in `src/components`. Prefer extending existing patterns over adding dependencies.

## Testing Guidelines

Tests are standalone `.mjs` scripts in `tests/`, generally named for the feature or area they cover (such as `map-logic.mjs`). Run them through their matching npm script rather than invoking them from an assumed test runner. Browser checks use Playwright; SQL checks use PGlite. Keep fixtures and assertions targeted to the behavior changed.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative descriptions, often prefixed by the feature or area, such as `SEO: ...` or `Add ...`. Follow that style and keep each commit focused. Pull requests should explain the user-visible change, list key implementation details, and include the checks run. Include screenshots or device/browser notes for visual, responsive, or AR changes; call out any migration or configuration requirements.

## Security & Configuration

Use `.env.example` as the template for local settings; keep credentials and machine-specific values out of commits. Do not commit `.env.local` or real user/contact data. Review changes to Supabase migrations and deployment configuration carefully.
