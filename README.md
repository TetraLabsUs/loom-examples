# Loom examples

Standalone apps, each proving one claim about the Loom SDK against your own tenant.

| Folder | Claim | SDK surface | Minutes to first result |
| --- | --- | --- | --- |
| [agent-trace](agent-trace/) | Every answer is auditable: each chat turn is a run whose events, tool calls, policy decisions and LLM calls you can replay, and watch live while it streams. | `useChatSessions`, `useChatRuns`, `useChatRun` (replay), `useSendChatMessage` with `includeTrace`, `useForkChatSession` | ~3 |
| [document-inspector](document-inspector/) | See exactly what Loom extracted: page renders with the extractor's regions overlaid, chunks with quality scores, and hybrid / vector / keyword search across all of it. | `useSources`, `useOverview`, `usePageImage`, `usePageRegions`, `useSearchChunks` | ~3 |
| [chat-with-your-files](chat-with-your-files/) | Upload a PDF, ask a question, get an answer with page citations: ingestion, retrieval and chat in one screen. | `sources.ingestFile`, `useSources`, `useOverview`, `LoomChatRoot` with a retrieval scope | ~10 |
| [scoped-workspaces](scoped-workspaces/) | Knowledge anchored to your own entities: each workspace has its own documents and a chat that answers only from them, in your own markup. | `ChatProvider` + `useChatState` / `useChatActions`, `useSearchChunks`, entity-keyed ingest | ~10 |
| [model-console](model-console/) | Your models, your terms: switch the model behind any use case without touching application code, and see what each model costs you. **Needs an admin-capable credential**; API keys are rejected on admin routes. | `@tetralabs/loom/admin`, `useLlmModels`, `useLlmUseCases`, `useLlmCalls` | ~5 |

Tested against `@tetralabs/loom`, `@tetralabs/loom-react`, `@tetralabs/loom-react-ui` **0.1.0**.

## New to the SDK?

Read [docs/loom-sdk-outline.md](docs/loom-sdk-outline.md) first. It is a ten-minute briefing on what Loom does, how entities, sources, groups, chunks, chat sessions and runs relate, what to expect at runtime, and the gotchas the examples work around. It is written for a developer, or an AI assistant helping one, who is about to build on the SDK; point your assistant at it before asking it to extend an example.

## Prerequisites

- Node 20 (see [.nvmrc](.nvmrc))
- A Loom tenant and an API key. Four examples need only a key that can read sources, ingest and chat. `model-console` needs an admin-capable credential (a user token; API keys are rejected on `/v1/admin/*`).
- For the two upload examples: a Cloudflare R2 bucket with an R2 API token, and a Loom **storage profile** that points at that bucket (Admin console → Storage profiles). The browser uploads to the bucket through a presigned URL issued by the Vite dev server; Loom then reads the object through the storage profile.

## Run any example

```sh
cd agent-trace                 # or any other folder
cp .env.example .env           # fill in the values described in the folder's README
npm i
npm run dev
```

Open the URL Vite prints (normally <http://localhost:5173>).

## How auth works in the examples

Vite inlines every `VITE_` variable into the browser bundle, so the Loom API key must never carry that prefix. Each `vite.config.ts` proxies `/loom` to `LOOM_API_URL` and adds `Authorization: Bearer <LOOM_API_KEY>` on the way out. The client is created with an absolute `baseUrl` pointing at that proxy; the `getHeaders` hook is left in place to show where a per-user token goes in production. Server-sent events stream through the proxy unchanged. The examples are dev-server only by design.

## Repository layout

Each folder is self-contained (`package.json`, `vite.config.ts`, `src/`) and imports nothing from a sibling. Copy a folder into your own project and go. Dependencies are pinned to exact versions; see each README for the versions it was tested against.

CI runs `npm ci`, `npm run typecheck` and `npm run build` for every folder on each push.

## License

MIT. See [LICENSE](LICENSE).
