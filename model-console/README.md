# model-console

**Claim:** your models, your terms — switch the model behind any use case without touching application code, and see what each model costs you (deck slides 6 and 15).

This is the slice of the admin console every product embedding Loom ends up putting in its own settings page, built with the `/admin` entry of the core client and the `/admin` hooks.

## What you need

- Node 20
- A Loom tenant and an **admin-capable** API key. A non-admin key produces one clear banner on each tab; nothing else works.

## Setup

```sh
cp .env.example .env
```

| Variable | What it is |
| --- | --- |
| `LOOM_API_URL` | Your tenant. Read by the dev proxy only. |
| `LOOM_API_KEY` | Admin-capable API key. Never `VITE_`-prefixed. |

## Run

```sh
npm i
npm run dev
```

## Walkthrough

1. **Models** lists every registered model: name, kind, provider, which use cases it is the default for, and the last test result.
2. Click **Test** on a model. A short completion runs server-side; latency and the result appear inline. A misconfigured model shows the server's error in the same cell, not a blank.
3. **Use cases** lists chat, embeddings, grading and transcription with their current default. Pick a different default for *embeddings*. No application code changes; the next ingest in `chat-with-your-files` uses it and its calls show the new model.
4. **Calls** lists recent LLM calls: time, use case, model, tokens in / out, latency, status. Filter by model. The bar chart above the table is tokens per model over the last 24 hours, computed client-side from the same list.
5. Notice that embeddings and grading dominate the token count. That is the volume you would pin to a flat-rate GPU instance.
6. Open **Admin** in the top bar and compare the LLM call log for the same window. The example is a thin view over the same API.

## Files that matter

- [src/loom.ts](src/loom.ts) — `createLoomAdminClient` pointed at the `/loom` proxy.
- [src/pages/Models.tsx](src/pages/Models.tsx) — `useLlmModels`, `useLlmUseCases`, `useTestLlmModel`.
- [src/pages/UseCases.tsx](src/pages/UseCases.tsx) — `useSetLlmUseCaseDefault`; the mutation invalidates the models and use-case queries, so the Models tab updates by itself.
- [src/pages/Calls.tsx](src/pages/Calls.tsx) — `useLlmCalls` with a model filter and a 30-line SVG bar chart.
- [vite.config.ts](vite.config.ts) — the `/loom` proxy that injects the key.

## SDK surface

Concepts (model registry, use-case routing, LLM call logs, admin auth) are in [docs/loom-sdk-outline.md](../docs/loom-sdk-outline.md).

| Need | Call |
| --- | --- |
| List models | `useLlmModels()` → `LoomLlmModel[]` (`name`, `kind`, `provider`, `model`, `enabled`) |
| Test a model | `useTestLlmModel(id).mutate()` → `{ success, latencyMs, message }` |
| Use cases and their defaults | `useLlmUseCases()` → `{ useCase, kind, default: { modelId, updatedAt } \| null }[]` |
| Change a default | `useSetLlmUseCaseDefault().mutate({ useCase, modelId })` |
| Call log | `useLlmCalls({ model?, limit })` → `LlmCall[]` (`purpose`, `model`, `promptTokens`, `completionTokens`, `totalTokens`, `tokensEstimated`, `latencyMs`, `status`, `error`) |

## Known limitations

- Dev-server only; see the root README for the auth pattern.
- The call log has no cost field in 0.1.0, so the chart shows tokens, not currency.
- The **Register** form from the spec is not included: the model schema (`provider`, `model`, `baseUrl`, `apiKey`) is confirmed, but the per-provider values are not, so registration stays in the admin console for now.
- Streamed calls report estimated token counts (`tokensEstimated`); the table marks them with `~`.
- `@tetralabs/loom-react` 0.1.0 publishes typings that reference a path the core package does not ship. `scripts/fix-sdk-types.mjs` runs after install and shims it.
- The logo in the top bar is a placeholder mark.

## Tested against

- `@tetralabs/loom`, `@tetralabs/loom-react` 0.1.0
- React 19.3.1, Vite 7.3.7, TypeScript 5.9.3
- Loom server: _fill in after the first live run_
