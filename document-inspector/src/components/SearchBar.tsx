import type { LoomSearchMode, LoomSearchResultChunk } from "@tetralabs/loom";
import { useSearchChunks } from "@tetralabs/loom-react/chunks";
import { useState } from "react";

/** Hybrid, vector or keyword search over the whole tenant; results jump to the document and chunk. */
export function SearchBar({ onPick }: { onPick: (r: LoomSearchResultChunk) => void }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<LoomSearchMode>("hybrid");
  const search = useSearchChunks();

  return (
    <div className="flex flex-col gap-2">
      <form
        className="panel flex gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) search.mutate({ query: query.trim(), mode, limit: 10 });
        }}
      >
        <input
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent p-1 outline-none"
          placeholder="Search all documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="panel px-1" value={mode} onChange={(e) => setMode(e.target.value as LoomSearchMode)}>
          <option value="hybrid">hybrid</option>
          <option value="vector">vector</option>
          <option value="keyword">keyword</option>
        </select>
        <button type="submit" className="btn" disabled={search.isPending || !query.trim()}>
          {search.isPending ? "…" : "Search"}
        </button>
      </form>
      {search.error && <p className="text-sm text-red-800">{search.error.message}</p>}
      {search.isSuccess && (
        <ul aria-label="Search results" className="panel max-h-64 divide-y divide-line overflow-y-auto text-sm">
          {search.data.length === 0 && <li className="px-3 py-2 text-ink-muted">Nothing found.</li>}
          {search.data.map((r) => (
            <li key={r.id}>
              <button type="button" className="flex w-full flex-col gap-0.5 px-3 py-2 text-left" onClick={() => onPick(r)}>
                <span className="flex w-full justify-between gap-2 text-xs text-ink-muted">
                  <span className="truncate">
                    {r.sourceRef} · {r.entityType}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {r.score != null ? `score ${r.score.toFixed(3)}` : `distance ${r.distance.toFixed(3)}`}
                  </span>
                </span>
                <span className="line-clamp-2">{highlight(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
