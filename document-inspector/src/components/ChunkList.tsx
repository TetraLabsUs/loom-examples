import type { LoomDocumentOverview, LoomOverviewChunk } from "@tetralabs/loom";
import { useEffect, useRef } from "react";

/** The embedded chunks with their quality scores and flags; selecting one highlights its page regions. */
export function ChunkList({
  overview,
  selectedChunkId,
  onSelect,
}: {
  overview: LoomDocumentOverview;
  selectedChunkId: string | null;
  onSelect: (chunk: LoomOverviewChunk) => void;
}) {
  const selectedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedChunkId]);

  const graded = overview.chunks.filter((c) => c.llmQualityScore != null).length;

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>
          {overview.chunks.length} chunks · {graded} LLM-graded
        </span>
        <span>extraction v{overview.currentExtractionVersion}</span>
      </div>
      <ol className="panel min-h-0 divide-y divide-line overflow-y-auto">
        {overview.chunks.map((c) => (
          <li
            key={c.id}
            ref={c.id === selectedChunkId ? selectedRef : undefined}
            className={c.id === selectedChunkId ? "bg-ground" : ""}
          >
            <button type="button" className="flex w-full flex-col gap-1 px-3 py-2 text-left" onClick={() => onSelect(c)}>
              <span className="flex w-full flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span className="font-mono">#{(c.chunkIndex ?? 0) + 1}</span>
                {c.page != null && <span>p.{c.page}</span>}
                <Score label="heuristic" value={c.heuristicQualityScore} />
                <Score label="llm" value={c.llmQualityScore} title={c.llmQualityRationale ?? undefined} />
                {c.qualityFlags.map((f) => (
                  <span key={f} className="rounded-full bg-amber-100 px-1.5 text-amber-900">
                    {f}
                  </span>
                ))}
              </span>
              <span className="line-clamp-3 whitespace-pre-wrap text-sm">{c.content}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Score({ label, value, title }: { label: string; value: number | null; title?: string }) {
  if (value == null) return null;
  return (
    <span title={title} className="rounded-full bg-ground px-1.5 tabular-nums">
      {label} {value.toFixed(2)}
    </span>
  );
}
