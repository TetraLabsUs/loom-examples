import type { LoomSearchResultChunk } from "@tetralabs/loom";
import { useSearchChunks } from "@tetralabs/loom-react/chunks";
import { useState } from "react";
import { ErrorBanner } from "../components/ErrorBanner";
import { DOCUMENT_ENTITY_TYPE, workspaceScope } from "../loom";

/** Hybrid search over this workspace's chunks only. */
export function SearchPanel({ workspaceId }: { workspaceId: string }) {
  const [query, setQuery] = useState("");
  const search = useSearchChunks();

  return (
    <div className="flex h-full flex-col">
      <form
        className="panel m-4 mb-0 flex gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (!q) return;
          search.mutate({
            query: q,
            mode: "hybrid",
            limit: 20,
            entityTypes: [DOCUMENT_ENTITY_TYPE],
            ...workspaceScope(workspaceId),
          });
        }}
      >
        <input
          aria-label="Search"
          className="flex-1 bg-transparent p-1 outline-none"
          placeholder="Search this workspace's documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn" disabled={search.isPending || !query.trim()}>
          {search.isPending ? "Searching…" : "Search"}
        </button>
      </form>
      <ErrorBanner error={search.error} onDismiss={() => search.reset()} />
      <div className="flex-1 overflow-y-auto p-4">
        {search.isIdle && <p className="text-center text-ink-muted">Results show document, snippet and score.</p>}
        {search.isSuccess && search.data.length === 0 && (
          <p className="text-center text-ink-muted">Nothing found in this workspace.</p>
        )}
        <ul className="flex flex-col gap-2">
          {(search.data ?? []).map((r) => (
            <Result key={r.id} result={r} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Result({ result }: { result: LoomSearchResultChunk }) {
  // `score` is set for hybrid/keyword hits; vector-only hits carry a distance.
  const score = result.score ?? 1 - result.distance;
  return (
    <li className="panel p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{result.sourceRef}</span>
        <span className="label whitespace-nowrap">
          score {score.toFixed(3)}
          {result.chunkIndex != null && ` · chunk ${result.chunkIndex + 1}`}
        </span>
      </div>
      <p className="mt-1 line-clamp-4 text-sm text-ink-muted">{highlight(result)}</p>
    </li>
  );
}

/** Wraps the server's highlight spans (UTF-16 offsets into `content`) in <mark>. */
function highlight(r: LoomSearchResultChunk) {
  const spans = [...r.highlights].sort((a, b) => a.start - b.start);
  if (spans.length === 0) return r.content;
  const out = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start < pos) continue;
    out.push(r.content.slice(pos, s.start));
    out.push(
      <mark key={s.start} className="bg-transparent font-semibold text-ink">
        {r.content.slice(s.start, s.end)}
      </mark>,
    );
    pos = s.end;
  }
  out.push(r.content.slice(pos));
  return out;
}
