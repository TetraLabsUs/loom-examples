# Loom SDK — Capabilities & Core Concepts (developer briefing)

Audience: a developer (or an AI assistant helping one) who is about to build on the Loom SDK and needs to know what the platform does, how its objects relate, and what to expect at runtime. Everything below reflects the published `@tetralabs/loom*` **0.1.0** typings and the example apps in this repo; each example's README links back here and lists the SDK surface it exercises.

---

## 1. What Loom is

Loom is a hosted **document intelligence + RAG backend**. You hand it documents (files in your own bucket, or raw text), it extracts/OCRs/chunks/embeds them in the background, and then exposes:

- **Search** over chunks (hybrid / vector / keyword, with highlights and quality scores)
- **Streaming chat** grounded in those chunks (citations, tool calls with approvals, runs/traces, fork/branch, sharing)
- **Document inspection** (page images, OCR regions, chunks, extraction generations)
- **Raw LLM completions**, **audio transcription**
- **Analytics**: a SQL-ish query layer with a catalog, plus dashboards
- **Admin/ops**: model registry, use-case routing, job queues, storage profiles, ingest patterns, skills, playbooks, sync schedules, API keys, LLM call logs

The SDK is a thin, typed HTTP/SSE/WebSocket client. The server owns all state and all authorization.

---

## 2. Packages & setup

| Package | What it is |
|---|---|
| `@tetralabs/loom` | Framework-agnostic client (fetch-based). Also exports `@tetralabs/loom/admin`. |
| `@tetralabs/loom-react` | TanStack Query v5 hooks. Root exports `ClientProvider`/`useClient`; feature hooks live on subpaths (`/chat`, `/sources`, `/documents`, `/chunks`, `/queries`, `/dashboards`, `/completions`, `/audio`, `/jobs`, `/admin`). Hook names have **no** `Loom` prefix. |
| `@tetralabs/loom-react-ui` | Headless chat + dashboard components. Only `/chat` and `/dashboard` subpaths (+ `/chat.css`). |

```ts
import { createLoomClient } from "@tetralabs/loom";

const loom = createLoomClient({
  baseUrl: "https://<loom-api>",         // absolute URL
  getHeaders: async () => ({ Authorization: `Bearer ${token}` }), // or X-API-Key
  fetch?, webSocket?                       // optional overrides
});
```

- Two call styles: free functions `searchLoomChunks(client, req)` or grouped `loom.chunks.search(req)`, `loom.sources.ingestFile(...)`, `loom.documents.getOverview(...)`, `loom.chat.*`, `loom.assets.url(path)`, etc.
- **Auth**: user JWT (`Authorization: Bearer`) or scoped API key (`X-API-Key`, scopes `read` | `write`). `/v1/admin/*` rejects API keys — admin needs a user JWT.
- **Browser apps**: never ship the API key. The examples use a Vite dev-server proxy (`/loom` → `LOOM_API_URL`, injects the key). In production, use per-user tokens via `getHeaders`.

---

## 3. Core concepts (the mental model)

### 3.1 Entity = your document identity
- `entityType` (string you choose: `"file"`, `"contract"`, `"ticket"`…) + `entityId` (string you choose) is **the primary key for everything**: ingestion, overview, search filters, chat scope, reprocessing.
- Loom imposes no schema on entity types. `listLoomEntityTypes()` returns what's currently ingested.

### 3.2 Source (a.k.a. the ingested document / "asset")
- One `LoomSource` row per entity: `id, entityType, entityId, sourceRef, contentType, chunkCount, groupType, groupId, pendingJobs/processingJobs/completedJobs/failedJobs, createdAt, updatedAt`.
- `sourceRef` is a free-form label (file name, URL, external id). `contentType` drives processing (PDF/image → page render + OCR; text → direct chunking).
- `listLoomSources({ q, entityTypes, statuses, groupType, groupId, limit })` is the "document list" call.
- Helpers: `loomDocumentKindFor(contentType)` → `pdf | image | text`; `loomDocumentStatusFor(source)` → `completed | processing | failed`.
- **Terminology note**: in the SDK, `assets` refers to *derived binary artifacts* served by the API (page images, region JSON). `loomAssetUrl(client, path)` / `loom.assets.url(path)` resolves an API-relative asset path against `baseUrl`. If a team says "asset" meaning "uploaded file", that's a **source**.

### 3.3 Groups (`groupType` / `groupId`)
- Optional app-defined partitioning on every source (e.g. `groupType: "workspace", groupId: "ws_123"`).
- Used for listing, search filters and chat retrieval scope. This is how multi-tenant / per-workspace isolation is done in the examples (`scoped-workspaces`).

### 3.4 Storage profiles & ingestion
- **File ingestion is not a byte upload.** `ingestLoomFile({ entityType, entityId, sourceRef, storageProfile, key, contentTypeHint?, groupType?, groupId?, metadata?, autoPromote?, priority?, queueName?, scheduledAt? })` tells Loom to *read* `key` from a pre-registered **storage profile** (S3-compatible or Supabase bucket, configured by an admin at `/v1/admin/storage-profiles`).
- Typical browser flow: your backend presigns an upload URL → browser PUTs the file to the bucket → you call `ingestLoomFile` with the object key → poll status.
- `ingestLoomText({ entityType, entityId, sourceRef, content, ... })` → `{ sourceId, chunksEnqueued, skippedUnchanged }` for raw text (idempotent on unchanged content).
- `ingestLoomSource({ source, entityType, entityId, ... })` → pattern-driven ingestion (admin-defined **ingest patterns** map an external source + entity to a storage key).
- **Status**: `getLoomIngestStatus(entityType, entityId)` → `{ pending, processing, completed, failed, total, done }` (`null` if unknown). Poll until `done`.

### 3.5 Chunks, highlights, quality
- A **chunk** is the embedding/search unit. Search returns `LoomSearchResultChunk`: `id, entityType, entityId, content, distance, page?, highlights[], heuristicQualityScore, llmQualityScore, qualityFlags, …`.
- `highlights` are `{ start, end, source }` spans in **UTF-16 code units** (JS string indexing) with `source: "lexical" | "semantic"`.
- Quality: `heuristicQualityScore` is immediate; `llmQualityScore`/rationale arrive later via background grading (`triggerLoomQualityGrade`, `getLoomQualitySummary`, `getLoomQualityReport(entityType, entityId)`).

### 3.6 Pages & regions (PDF / image documents)
- `LoomPageSummary`: `page, widthPx, heightPx, dpi, imageUrl, regionsUrl`.
- `getLoomPageImage(client, imageUrl)` → authenticated fetch → `Blob`/object URL (caller revokes). `getLoomPageRegions(client, regionsUrl)` → `LoomPageRegion[]` with normalized `[0,1]` boxes, `text`, `confidence`, and the owning `chunkId`.
- Lets you render a page and overlay where each chunk/OCR region came from.

### 3.7 Generations (versions of an extraction)
- Every (re)processing produces a **generation**. Exactly one is **active** and serves search/chat.
- `LoomGenerationSummary`: `generation, isActive, autoPromote, extractionVersion, chunkCount, createdAt`.
- `reprocessLoomDocument(entityType, entityId, { autoPromote?, queueName?, scheduledAt? })` creates a new staged generation. `promoteLoomGeneration(entityType, entityId, n)` atomically switches the active one. Nothing is deleted → rollback = promote an older generation.
- `getLoomOverview(entityType, entityId, generation?)` → `LoomDocumentOverview { source, extractionJobs[], generations[], pages[], chunks[], currentExtractionVersion }` — the single "everything about this doc" call. Returns partial data while processing; `null` only if nothing exists.

### 3.8 Retrieval scope
- `LoomChatRetrievalScope { entityTypes?, entityIds?, groupType?, groupId? }`.
- Attach one or more scopes to a session or override per message. Filters within a scope are ANDed; multiple scopes are ORed.
- No arbitrary chunk-filter language — scoping is by entity type / id / group only.

### 3.9 Chat sessions, messages, runs
- **Session** (`LoomChatSession`): `id, title, modelId, skillId, toolCollections, scopes, visibility, ownerId, collaborators, sharingRevision, isPinned, isArchived, forkedFromSessionId/MessageId, metadata`.
- Sessions are **created with a prompt** — creation already executes the first RAG turn (title auto-generated if omitted). There is no "empty session".
- **Message** (`LoomChatMessage`): `role: user | assistant | system | tool`, `parentMessageId` (messages form a tree → branching), `citations[]` on assistant messages.
- **Run** (`LoomChatAgentRun`): execution record of one turn — `status, iterations, toolCallCount, usedFallback, skillId, error, completedAt`. `getLoomChatRun` returns a full **replay** (ordered `LoomChatRunEvent`s, tool calls, approvals, LLM calls, policy decisions). Runs can be re-run.
- **Tool approvals**: when a tool call matches an approval policy the stream pauses with `awaiting_approval`; call `decideLoomChatApproval(id, "approve" | "reject")` then `resumeLoomChatRun(runId)` (streaming variant exists). `cancelLoomChatRun(runId)` aborts.
- **Fork**: `forkLoomChatSession(sessionId, { messageId?, title? })` copies history up to a message into a new session. `setLoomActiveChatMessage` navigates branches.
- **Sharing**: `visibility: private | restricted`, collaborator list, optimistic concurrency via `expectedRevision`.

### 3.10 Skills, playbooks, tool collections
- **Skill**: reusable chat behaviour (prompt template, tools, approval policy). A session points to a `skillId`.
- **Playbook**: named retrieval/summarization recipe with bindings (search queries, catalog concepts, document fields).
- **Tool collections**: which tools the agent may call in a session.
- All CRUD is admin-side; client sessions only reference them by id.

### 3.11 Models, use cases, LLM calls
- **Model** (`LoomLlmModel`): provider config (provider, model name, base URL, key ref, cost). `testLoomLlmModel` pings it.
- **Use case** (`LoomLlmUseCase`): logical role (`chat`, `title_generation`, `quality_grading`, …) → default model mapping (`setLoomLlmUseCaseDefault`). A session's `modelId` overrides the chat default.
- **LLM call** log (`LlmCall`): one row per provider request — purpose, provider/model, stream flag, session/run/entity context, (redacted) request/response, token counts, latency, `status: success | error`. Queryable via `listLoomLlmCalls`.

### 3.12 Query language, catalog, dashboards
- **Query sources**: named databases (`"loom"` built-in + registered external Postgres). `getLoomCatalog(source)` → schemas, tables, typed columns (filterable/groupable/sensitive flags), relationships, row policies.
- Three result shapes: **scalar** (`SELECT … AS value`), **categorical** (`category, value`), **table**. `runLoomScalarQuery / runLoomCategoricalQuery / runLoomTableQuery(query, source, timeRange?)`; time ranges are `{ fromMs, toExclusiveMs }`.
- `validateLoomQuery` (diagnostics only), `compileLoomQuery` (parameterized SQL), `suggestLoomQuery` (LLM-assisted authoring).
- **Dashboards**: `LoomDashboard` with widgets (scalar, categorical, table, timeseries, gauge, funnel, donut, toplist, treemap, change, note, image, iframe…) bound to queries via a small binding language (`$query/<key>`, `$sum`, `$template`, `$format`). Templates, import, sharing, revision-guarded updates.

### 3.13 Jobs, queues, sync
- Everything heavy is a **job**: `queued → processing → completed | failed`. `getLoomJobStatus(jobId)`, logs, status history, LLM outputs per job.
- **Queues** are named, optionally cron-scheduled windows (`alwaysActive` or schedules). Ingest calls accept `queueName`, `priority`, `scheduledAt`.
- **Sync schedules** (admin) drive pattern-based re-ingestion from external systems; per-entity sync state is `queued | processing | failed | not_synced | stale | up_to_date`.

### 3.14 Completions & audio
- `streamLoomCompletion(params, handlers)` — one-off LLM call, no session, SSE deltas + final `{ usage, finishReason, llmCallId }`.
- `transcribeLoomAudio({ file, language? })` (multipart) and `connectLoomLiveTranscription({ language? })` (WebSocket, `loom-bearer` subprotocol).

---

## 4. Capability map (what you can build)

| You want to… | Use |
|---|---|
| Upload & index files | presign → bucket PUT → `ingestLoomFile` → poll `getLoomIngestStatus` |
| Index text/HTML you already have | `ingestLoomText` |
| List documents / filter by workspace | `listLoomSources({ groupType, groupId, entityTypes, q, statuses })` |
| Full-text / semantic search with snippets | `searchLoomChunks({ query, mode, entityTypes, groupType/Id, limit, maxDistance, llmHighlight })` |
| Show a document viewer with highlights | `getLoomOverview` + `getLoomPageImage` + `getLoomPageRegions` |
| Re-extract with a newer pipeline, preview, then switch | `reprocessLoomDocument` → `getLoomOverview(…, gen)` → `promoteLoomGeneration` |
| "Chat with your files" | `streamLoomCreateChatSession({ prompt, scopes })` / `streamLoomChatMessage(sessionId, content, handlers, scopes?)` |
| Session list, rename, pin, archive, fork, share | `listLoomChatSessions`, `updateLoomChatSession`, `forkLoomChatSession`, `*ChatSessionSharing` |
| Agent observability / replay UI | `listLoomChatRuns`, `getLoomChatRun` (events), `rerunLoomChatRun`, `listLoomLlmCalls` |
| Human-in-the-loop tools | `onConfirmationRequired` → `decideLoomChatApproval` → `streamLoomResumeChatRun` |
| Plain LLM call | `streamLoomCompletion` |
| Voice input | `transcribeLoomAudio` / `connectLoomLiveTranscription` |
| Metrics & BI | catalog + `runLoom*Query` + dashboards |
| Ops console | admin client: models, use cases, queues, storage profiles, patterns, skills, playbooks, API keys, config, user audit |

---

## 5. React layer (published export names — verified against `node_modules/@tetralabs/*/dist/*.d.ts`, v0.1.0)

**Naming rule:** `@tetralabs/loom` (core) exports `Loom`-prefixed functions/types (`createLoomClient`, `searchLoomChunks`, `LoomSource`…). `@tetralabs/loom-react` **drops the `Loom` prefix** and is split into subpath entry points. `@tetralabs/loom-react-ui` keeps the `Loom` prefix and only has `/chat` and `/dashboard` subpaths (no root import).

### `@tetralabs/loom-react`
| Import path | Exports |
|---|---|
| `@tetralabs/loom-react` | `ClientProvider({ client, children })`, `useClient()` → `LoomClient`, `queryKeys` |
| `…/chat` | `ChatProvider({ options: LoomChatControllerOptions, children })`, `useChat()` → `ChatController`, `useChatState()`, `useChatActions()`, `useChatActivity()`, `useChatApprovalState()`, `useChatController(options)`; hooks: `useChatSessions`, `useChatSession`, `useCreateChatSession`, `useSendChatMessage`, `useChatMessages`, `useUpdateChatSession`, `useForkChatSession`, `useSetActiveChatMessage`, `useChatRuns`, `useChatRun`, `useChatRunReplays`, `useRerunChatRun`, `useResumeChatRun`, `useCancelChatRun`, `useChatApprovals`, `useDecideChatApproval`, `useChatSessionSharing`, `useReplaceChatSessionSharing`. Types: `ChatMessageView`, `ChatActivityState`, `ChatApprovalState`, `ChatSendOptions`, `ChatCapabilities`, `ChatBranchPosition`… |
| `…/sources` | `useSources`, `useEntityTypes`, `useIngestStatus`, `useEntitySyncState`, `useEntitySyncStates` |
| `…/documents` | `useOverview`, `usePageImage`, `usePageRegions` |
| `…/chunks` | `useSearchChunks`, `useDistanceGraph` |
| `…/completions` | `useCompletion` |
| `…/audio` | `useTranscribeAudio` |
| `…/jobs` | `useRecentJobs` (+ `JobStatusFilter`, `JobTypeFilter`, `RecentJobRow`) |
| `…/queries` | `useCatalog`, `useQuerySources`, `useCompileQuery`, `useValidateQuery`, `useExplorerRows` |
| `…/dashboards` | `useDashboards`, `useDashboard`, `useDashboardQueries`, `useDashboardTemplates`, `useDashboardTemplate`, `useCreateDashboard`, `useUpdateDashboard`, `useDeleteDashboard`, `useDashboardSharing`, `useReplaceDashboardSharing` |
| `…/admin` | `useAdminClient`; models: `useLlmModels`, `useLlmModel`, `useCreate/Update/Delete/TestLlmModel`, `useLlmUseCases`, `useSetLlmUseCaseDefault(s)`; `useLlmCalls`, `useLlmCall`; jobs: `useJobStatus`, `useJobLogs`, `useJobQueue(s)`, `useCreate/Update/DeleteJobQueue`, `useAdd/Update/DeleteJobQueueSchedule`; `useStorageProfile(s)` + CRUD + `useTestStorageProfile`; `useIngestPattern(s)` + CRUD + `usePreviewIngestPattern`; `useSkill(s)` + CRUD, `useChatTools`; `usePlaybook(s)` + CRUD, versions, catalog, search, reindex; sync: `useSyncSchedules`, `useSyncRun(s)`, `useSyncRunItems`, `useStartSyncRun`, `useCancelSyncRun`; quality: `useQualitySummary`, `useQualityReport`, `useQualityGrade`, `usePromoteGeneration`; config: `useConfig`, `useConfigOverrides`, `useUpdateConfig`, `useResetConfig`; `useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`; admin chat: `useAdminChatSessions`, `useAdminChatSession`, `useAdminChatSessionRuns`, `useAdminChatRuns`, `useAdminChatRunTimeline`; `useAdminUserAudit`, `useAdminUserAuditResources`; `useImportDashboards` |

Minimal wiring:
```tsx
import { createLoomClient } from "@tetralabs/loom";
import { ClientProvider } from "@tetralabs/loom-react";
import { ChatProvider, useChatState, useChatActions } from "@tetralabs/loom-react/chat";

const client = createLoomClient({ baseUrl, getHeaders });
<QueryClientProvider client={qc}>
  <ClientProvider client={client}>
    <ChatProvider options={{ scopes: [{ groupType: "workspace", groupId }] }}>…</ChatProvider>
  </ClientProvider>
</QueryClientProvider>
```
(`ClientProvider` does not create a TanStack `QueryClient`; you provide one.)

### `@tetralabs/loom-react-ui`
- `…/chat`: `LoomChatRoot` (+ `useLoomConversation`, `LoomConversation*` types), `LoomChatMessages`, `LoomChatComposer`, `useLoomChatSessionsController`, `useLoomChatSessionActions`, `useLoomChatSharing`, `useLoomRetrievalScope`, `buildLoomRetrievalScope`. Styles: `@tetralabs/loom-react-ui/chat.css`.
- `…/dashboard`: `LoomDashboardRoot`, `LoomDashboardView`, `LoomDashboard`, `LoomDashboardBoard`, `LoomDashboardBoardView`, `useLoomDashboard`, `useLoomDashboardController`, `resolveLoomDashboardBindings`, `collectLoomDashboardQueryKeys`, `buildLoomDashboardWidgetDescriptors`, Screenboard/Timeboard layouts, widgets (`BarWidget`, `ChangeWidget`, `DonutWidget`, `FunnelWidget`, `GaugeWidget`, `IframeWidget`, `ImageWidget`, `NoteWidget`, `QueryValue`, `ScatterWidget`, `TableWidget`, `TextWidget`, `TimeseriesWidget`, `TopListWidget`, `TreemapWidget`, `WidgetCard`).

### `@tetralabs/loom` (core) entry points
- `@tetralabs/loom`: `createLoomClient`, `LoomClient`, `LoomTransport`, `LoomApiError`, `LoomHeadersProvider`, all `Loom*` domain types, helpers (`dataTypeKind`, `dataTypeLabel`, `lastDays/lastHours/nextDays`), plus everything from `chatApproval`, `chatTrace`, `display`, `document`, `skillConfiguration` modules.
- `@tetralabs/loom/admin`: `createLoomAdminClient`, `LoomAdminClient`, admin types (`LlmCall`, `LoomLlmModel`, `LoomLlmUseCase`, `LoomJobQueue`, `LoomStorageProfile`, `LoomIngestPattern`, `LoomSkill`, `LoomPlaybook`, `LoomSyncRun`, `LoomApiKey`, `LoomAppConfig`, …), `loomAuditResourceTypes`.

---

## 6. What to expect at runtime

- **Async-first.** Ingestion, extraction, quality grading, sync are background jobs. Poll (`getLoomIngestStatus`, `getLoomJobStatus`, overview). No webhooks in the SDK today.
- **Streaming** is SSE for chat/completion (pass an `AbortSignal`; no auto-reconnect) and WebSocket for live audio.
- **Errors** throw `LoomApiError { status, statusText, body, method, url, headers }`; server body is usually `{ error: string }`. Query validation returns diagnostics instead of throwing. Expect 401/403 from server-side authz, 429 under load — back off.
- **Pagination**: `limit` (+ `offset` on some lists, `cursor`/`nextCursor` on admin audit lists). Defaults ~50–100.
- **IDs**: UUIDs for Loom-owned objects; `entityId` is whatever you pass. API key secrets are only returned on creation.
- **Timestamps**: ISO-8601 strings; durations/latency in ms; query time ranges in epoch ms.
- **Offsets** (highlights, regions↔text) are UTF-16 code units — beware when bridging to byte-based systems.
- **Chat history window** is capped by server config (`chatHistoryLimit`); older messages stay stored but drop out of context.
- **Idempotency**: `ingestLoomText` skips unchanged content; re-ingesting a file creates a new generation rather than mutating the active one.
- **Dashboards & sessions** use `expectedRevision` optimistic concurrency — handle 409s by refetching.

---

## 7. Common gotchas

1. Trying to POST file bytes to Loom — you can't; use a storage profile + object key.
2. Forgetting `groupType/groupId` on ingest → documents are invisible to group-scoped search/chat.
3. Expecting search results immediately after ingest — wait for `done`.
4. Using an API key for `/v1/admin/*` — rejected; needs a user JWT.
5. Treating session creation as cheap — it runs an LLM turn.
6. Not handling `awaiting_approval` in the stream → UI appears hung.
7. Revoking page-image object URLs too early / never (memory leaks).
8. Assuming chunk order == document order for non-paged content; sort by `chunkIndex`/`page`.

---

## 8. Reference example apps in this repo

- `chat-with-your-files` — presign upload → ingest → poll → scoped streaming chat with citations.
- `scoped-workspaces` — group-based multi-tenant isolation across documents, search and chat.
- `document-inspector` — overview, page images, OCR region overlays, chunk list, generations.
- `agent-trace` — sessions, runs, event timeline/replay, approvals.
- `model-console` — admin: models, use-case defaults, LLM call log.
