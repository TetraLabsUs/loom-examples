# Contributing

Start with [docs/loom-sdk-outline.md](docs/loom-sdk-outline.md) if you have not built on the SDK before; it is the shared mental model the examples assume.

## Adding an example

1. Copy `agent-trace/` (no uploads) or `chat-with-your-files/` (with uploads) to a new folder. Keep the folder standalone: its own `package.json`, no imports from siblings, no workspace tooling.
2. Keep the shared conventions: Vite + React 18 + TypeScript, Tailwind for utilities, `src/tokens.css` for the handful of design tokens, TanStack Query, and the `/loom` dev proxy that injects the API key (see `vite.config.ts`).
3. Reuse the five shared components by copying them: `TopBar`, `FileDrop`, `StatusPill`, `EmptyState`, `ErrorBanner`.
4. The README must follow the same order as the existing ones: claim · what you need · setup · run · walkthrough (ending in the admin console) · files that matter · SDK surface · known limitations · tested-against versions.
5. Pin every dependency to an exact version.
6. Add the folder name to the matrix in `.github/workflows/ci.yml`.
7. Add a row to the table in the root `README.md`.

## Rules

- One claim per app. Features that do not serve the claim stay out.
- No fixtures. A fresh tenant with no data is the starting state, and every screen's empty state tells the developer what to do first.
- Only shipped API. If a call is not in the published package, do not use it.
- `npm run typecheck` and `npm run build` must pass in every folder.

## Updating for a new SDK release

One PR updates all folders: bump the three `@tetralabs/*` pins, run typecheck and build in each folder, update the tested-against line in every README, re-read `docs/loom-sdk-outline.md` against the new typings and fix anything that drifted, and move the `sdk-x.y.z` tag.
