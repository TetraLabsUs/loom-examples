# scoped-workspaces

**Claim:** knowledge anchored to your own business objects — each workspace has its own documents and a chat that answers only from them, built with the headless controller in your own markup (deck slides 5, 13, 15).

A **workspace** is a client-side record `{ id, name }` kept in `localStorage`. It stands in for the real entity in your product: a customer, a project, a site. The only thing Loom knows about it is the key on each document (`groupType: "workspace"`, `groupId: <id>`), which is the point: the system of record stays yours.

## What you need

- Node 20
- A Loom tenant and an API key that can ingest, search and chat.
- A **Cloudflare R2** bucket, an R2 API token, a Loom **storage profile** that reads from it, and a CORS rule on the bucket allowing `PUT` from `http://localhost:5173` (see `chat-with-your-files/README.md` for the details).

## Setup

```sh
cp .env.example .env
```

Same variables as `chat-with-your-files`: `LOOM_API_URL`, `LOOM_API_KEY`, `VITE_STORAGE_PROFILE`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

## Run

```sh
npm i
npm run dev
```

## Walkthrough

1. Empty state: "Create your first workspace." Name it; it appears in the rail with its ready-document count.
2. Inside the workspace, drop PDFs. Each ingests tagged with the workspace's key; pills move `queued` → `processing` → `ready`.
3. Ask a question. Retrieval is scoped to the workspace, so the answer draws only on its documents. Create a second workspace with different documents and ask the same question: a different answer. A workspace with no documents cannot chat at all — its empty state asks for a document first.
4. Open **Search**: hybrid search over this workspace's chunks, with document name, highlighted snippet and score. Switch workspace; the same query returns different results.
5. While an answer streams, click **Stop**. The partial message stays and the composer is usable again.
6. Reload the page and switch between workspaces: each one restores its own conversation (the session id is stored per workspace).
7. Open **Admin** in the top bar. Under documents, each one carries `workspace` / `<id>` as its group — your keys, in Loom. Under chat sessions, find the sessions this app created.

## Files that matter

- [src/workspaces.ts](src/workspaces.ts) — the `localStorage` store: workspaces, `workspaceId → sessionId`, pending uploads.
- [src/loom.ts](src/loom.ts) — the client and `workspaceScope(id)`, the one key that ties documents, search and chat to a workspace.
- [src/chat/Thread.tsx](src/chat/Thread.tsx) — `useChatState` → messages with roles, a streaming cursor and citation chips.
- [src/chat/Composer.tsx](src/chat/Composer.tsx) — `useChatActions` → `send`, and `cancel` while streaming.
- [src/search/SearchPanel.tsx](src/search/SearchPanel.tsx) — `useSearchChunks` scoped to the workspace, highlights rendered from the server's spans.
- [src/WorkspaceView.tsx](src/WorkspaceView.tsx) — the `ChatProvider` in controlled mode, keyed by workspace.

## SDK surface

Concepts (entities, groups, retrieval scopes, the headless chat controller) are in [docs/loom-sdk-outline.md](../docs/loom-sdk-outline.md).

| Need | Call |
| --- | --- |
| Ingest with your key | `client.sources.ingestFile({ entityType: "document", entityId, sourceRef, storageProfile, key, groupType: "workspace", groupId })` |
| Documents per workspace | `useSources({ entityTypes: ["document"] })`, filtered by `groupType` / `groupId` client-side (the server applies `groupType` only together with a `groupId`) |
| Headless chat | `ChatProvider`, `useChatState().messages` (`role`, `content`, `state`, `citations`), `useChatActions().send / cancel` |
| Scope the chat | `options.scopes = [{ groupType, groupId }]` |
| Per-workspace sessions | `options.session = { mode: "controlled", id, onChange }`; `onChange` reports the id Loom creates for a new conversation |
| Hybrid search | `useSearchChunks().mutate({ query, mode: "hybrid", groupType, groupId })` → `sourceRef`, `content`, `highlights`, `score`, `distance` |
| Citations | `message.citations[]` → `{ sourceRef, entityType, entityId, chunks: [{ chunkId, page }] }`; chunk text via `useOverview`, page via `usePageImage` |

## Known limitations

- Dev-server only; uploads go through the dev server's `/api/presign`. See the root README.
- In Loom one entity is one document, so the workspace key goes on the document's **group**, not its entity (the spec's `entityType: "workspace"` would make every file a new generation of the same document). The admin console shows the key under group type / group id.
- Search filters by group, so results are scoped exactly like chat; it does not filter by entity id.
- Loom retries a failed extraction before giving up; the pill reads the error off the latest extraction job so a bad file shows `failed` straight away.
- **Stop** cancels the run server-side. If the answer finishes in the instant between the click and the request, Loom answers `409 conflict` and the banner shows it; the completed message is kept either way.
- The spec's "switch to uncontrolled for a new workspace" is unnecessary: controlled mode with `id: null` plus `onChange` covers both cases and keeps the session mode stable for the mounted controller.
- `@tetralabs/loom-react` 0.1.0 publishes typings that reference a path the core package does not ship. `scripts/fix-sdk-types.mjs` runs after install and shims it.
- The logo in the top bar is a placeholder mark.

## Tested against

- `@tetralabs/loom`, `@tetralabs/loom-react` 0.1.0
- React 19.3.1, Vite 7.3.7, TypeScript 5.9.3
- A Loom dev tenant, 2026-10-28, with a Cloudflare R2 bucket (two workspaces, same question → different cited answers; reload restores each conversation; search scoped per workspace)
