# chat-with-your-files

**Claim:** upload a PDF, ask a question, get an answer with page citations — ingestion, retrieval and chat in one screen (deck slides 5–7).

## What you need

- Node 20
- A Loom tenant and an API key that can ingest and chat.
- A **Cloudflare R2** bucket, an R2 API token with Object Read & Write on it, and a Loom **storage profile** that reads from it (Admin console → Storage profiles, provider `s3`, region `auto`, the bucket's S3 API endpoint, and the same token).
- The bucket needs a CORS rule that allows `PUT` from the dev server origin, because the browser uploads directly (R2 bucket → Settings → CORS Policy):

  ```json
  [{ "AllowedOrigins": ["http://localhost:5173"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"] }]
  ```

## Setup

```sh
cp .env.example .env
```

| Variable | What it is |
| --- | --- |
| `LOOM_API_URL` | Your tenant, e.g. `https://acme.loom.tetralabs.us`. Read by the dev proxy only. |
| `LOOM_API_KEY` | API key. Never `VITE_`-prefixed, so it never reaches the browser bundle. |
| `VITE_STORAGE_PROFILE` | Name of the Loom storage profile that points at `S3_BUCKET`. |
| `S3_BUCKET` | R2 bucket name. |
| `S3_REGION` | `auto` (R2's only region). |
| `S3_ENDPOINT_URL` | The bucket's S3 API endpoint from R2 → Settings, without the `/<bucket>` path: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | The R2 API token (Object Read & Write). Used only by the dev server to presign uploads. |

## Run

```sh
npm i
npm run dev
```

## Walkthrough

1. Open the app. The empty state says "Drop a PDF to ingest your first document."
2. Drop one or more PDFs. Each one uploads to the bucket (progress bar), then `sources.ingestFile` hands the object key to Loom. The document appears as `queued`.
3. The list polls every two seconds while anything is in flight; pills move `queued` → `processing` → `ready`. A document the server cannot extract shows `failed` with the server's message and attempt count while Loom retries it. (To see one, rename a `.txt` to `.pdf` and drop it.)
4. When at least one document is `ready`, the chat unlocks. Ask a question. The answer streams in; the sources it used appear as chips under the transcript (`[1] manual.pdf p.12`).
5. Click a chip. The right panel shows the cited chunk's text and, where the server rendered one, the page image.
6. Open **Admin** in the top bar. Find this chat session under chat sessions, open its run, and read the LLM call log for it. The same calls are visible under LLM calls.

Close and reopen the tab: the document list is still there (it comes from Loom), and the chat starts a new session (uncontrolled mode).

## Files that matter

- [src/loom.ts](src/loom.ts) — the client (absolute `baseUrl` at the `/loom` proxy) and the group every document is tagged with.
- [src/main.tsx](src/main.tsx) — `QueryClientProvider` › `ClientProvider` › `App`.
- [src/components/FileDrop.tsx](src/components/FileDrop.tsx) + [src/upload.ts](src/upload.ts) — presign, upload with progress, then ingest.
- [src/documents.ts](src/documents.ts) — document list, status derivation, polling.
- [src/App.tsx](src/App.tsx) — `LoomChatRoot` with a retrieval scope on the app's group.
- [vite.config.ts](vite.config.ts) + [presign.ts](presign.ts) — the `/loom` proxy that injects the key, and the `/api/presign` dev endpoint.

## SDK surface

Concepts (entities, sources, storage profiles, retrieval scopes) are in [docs/loom-sdk-outline.md](../docs/loom-sdk-outline.md).

| Need | Call |
| --- | --- |
| Ingest a stored object | `client.sources.ingestFile({ entityType, entityId, sourceRef, storageProfile, key, groupType, groupId })` |
| Document list and status | `useSources({ groupType, groupId }, { refetchInterval })`; status derived from `pendingJobs` / `processingJobs` / `failedJobs` / `chunkCount` |
| Failure message | `useOverview(entityType, entityId)` → `extractionJobs[0].error`, `attempts` |
| Chat with citations | `LoomChatRoot` with `options.scopes = [{ groupType, groupId }]`; `useChatState().messages[].citations` |
| Cited chunk and page image | `useOverview` → `chunks[]`, `pages[]`; `usePageImage(page.imageUrl)` |

## Known limitations

- Dev-server only. The `/loom` proxy and `/api/presign` live in `vite.config.ts`; `npm run build` produces a bundle with no backend.
- Loom has no upload endpoint, so the browser uploads to R2 with a presigned URL from the dev server (`@aws-sdk/client-s3` speaks R2's S3-compatible API; no AWS account is involved). In your product, your own backend issues that URL.
- A document is remembered locally as `queued` until Loom creates its source row; clearing site data before that happens hides it until extraction starts.
- Loom retries a failed extraction before giving up, so `failedJobs` stays 0 for a while; the pill reads the error off the latest extraction job instead. Re-ingesting (`documents.reprocess`) is an admin call and is not in this example.
- The shipped `LoomChatMessages` 0.1.0 also prints the answer's raw markdown as an "activity" line under the user message while a turn is in flight; the assistant bubble renders it correctly.
- `@tetralabs/loom-react` 0.1.0 publishes typings that reference a path the core package does not ship. `scripts/fix-sdk-types.mjs` runs after install and shims it; remove the script when the SDK fixes this.
- The logo in the top bar is a placeholder mark. Replace `public/logo.svg` with the brand lockup for light grounds.

## Tested against

- `@tetralabs/loom`, `@tetralabs/loom-react`, `@tetralabs/loom-react-ui` 0.1.0
- React 19.3.1 (the UI package's typings target React 19), Vite 7.3.7, TypeScript 5.9.3
- A Loom dev tenant, 2026-10-28, with a Cloudflare R2 bucket (upload → ingest → cited answer → page image confirmed end to end)
