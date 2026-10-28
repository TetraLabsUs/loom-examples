# document-inspector

**Claim:** you can see exactly what Loom extracted from a document — every page, every region the extractor found and where it came from, every chunk with its quality score — and search across all of it, from the standard client alone.

## What you need

- Node 20
- A Loom tenant with at least one ingested document and an API key that can read sources. PDFs show the page overlay; text sources show chunks only.

## Setup

```sh
cp .env.example .env
```

| Variable | What it is |
| --- | --- |
| `LOOM_API_URL` | Your tenant. Read by the dev proxy only. |
| `LOOM_API_KEY` | API key. Never `VITE_`-prefixed. |

## Run

```sh
npm i
npm run dev
```

## Walkthrough

1. The left rail lists every ingested source on the tenant with its entity type, content type, chunk count and status. Filter by entity type or name.
2. Pick a PDF. The header shows its entity key, how many generations exist and the extraction job history.
3. The page renders with the extractor's regions drawn on top. Switch between paragraphs, lines and words; hover a region to see its text, which extractor produced it (`pdfium_text_layer`, `tesseract`, …) and its OCR confidence where there is one.
4. The right column lists the embedded chunks with page number, heuristic and LLM quality scores and any flags (`near_duplicate`, …). Click a chunk: the page jumps to it and its regions highlight. Click a region: its chunk is selected.
5. Search at the top in hybrid, vector or keyword mode. Results show the server's highlight spans; clicking one opens that document and selects the matching chunk.
6. Pick a text source (an ingested ticket or note): there are no pages to overlay, so the inspector says so and shows the chunks.
7. Open **Admin** in the top bar and find the same document under documents.

## Files that matter

- [src/components/SourceRail.tsx](src/components/SourceRail.tsx) — `useEntityTypes`, `useSources({ entityTypes, q })`.
- [src/components/PageViewer.tsx](src/components/PageViewer.tsx) — `usePageImage` (authenticated blob URL) and `usePageRegions` drawn as normalised boxes.
- [src/components/ChunkList.tsx](src/components/ChunkList.tsx) — `overview.chunks[]` with quality scores and flags.
- [src/components/SearchBar.tsx](src/components/SearchBar.tsx) — `useSearchChunks` with mode selection and highlight rendering.
- [src/App.tsx](src/App.tsx) — `useOverview(entityType, entityId)` ties it together.

## SDK surface

Concepts (entities, sources, overviews, pages, regions, chunks) are in [docs/loom-sdk-outline.md](../docs/loom-sdk-outline.md).

| Need | Call |
| --- | --- |
| Entity types | `useEntityTypes()` → `string[]` |
| Sources | `useSources({ entityTypes, q, limit })` → `LoomSource[]` (`sourceRef`, `contentType`, `chunkCount`, job counts) |
| Document overview | `useOverview(entityType, entityId)` → `pages[]`, `chunks[]`, `generations[]`, `extractionJobs[]`, `currentExtractionVersion` |
| Page image | `usePageImage(page.imageUrl)` → object URL (the SDK fetches it with auth) |
| Page regions | `usePageRegions(page.regionsUrl)` → `{ x, y, width, height, text, regionType, source, confidence, chunkId }[]` |
| Search | `useSearchChunks().mutate({ query, mode, limit })` → `highlights[]`, `score`, `distance`, `entityType`, `entityId` |

## Known limitations

- Dev-server only; see the root README for the auth pattern.
- The client's `baseUrl` must be absolute (`new URL("/loom", location.origin).href`): the SDK resolves asset URLs against `baseUrl` twice, which is only idempotent for absolute URLs.
- Regions nest (a paragraph contains its lines and words); the overlay shows one level at a time, and clicks land on the innermost box.
- LLM quality scores are `null` until the tenant's grading job has run for that chunk.
- `@tetralabs/loom-react` 0.1.0 publishes typings that reference a path the core package does not ship. `scripts/fix-sdk-types.mjs` runs after install and shims it.
- The logo in the top bar is a placeholder mark.

## Tested against

- `@tetralabs/loom`, `@tetralabs/loom-react` 0.1.0
- React 19.3.1, Vite 7.3.7, TypeScript 5.9.3
- A Loom dev tenant, 2026-10-28
