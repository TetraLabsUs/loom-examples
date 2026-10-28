import type { LoomPageRegion, LoomPageSummary } from "@tetralabs/loom";
import { usePageImage, usePageRegions } from "@tetralabs/loom-react/documents";
import { useState } from "react";

/**
 * The rendered page with the extractor's regions drawn on top. Regions are
 * normalised boxes, so the overlay is a plain absolutely-positioned div per box.
 */
export function PageViewer({
  page,
  highlightChunkId,
  onPickChunk,
}: {
  page: LoomPageSummary;
  highlightChunkId: string | null;
  onPickChunk: (chunkId: string | null) => void;
}) {
  const image = usePageImage(page.imageUrl);
  const regions = usePageRegions(page.regionsUrl);
  const [level, setLevel] = useState<"word" | "line" | "paragraph" | "all">("paragraph");
  const [hover, setHover] = useState<LoomPageRegion | null>(null);

  const shown = (regions.data ?? []).filter((r) => level === "all" || r.regionType === level || r.regionType === "image");
  const sources = [...new Set((regions.data ?? []).map((r) => r.source))];

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <span>
          page {page.page} · {page.widthPx}×{page.heightPx}px{page.dpi ? ` @ ${page.dpi} dpi` : ""}
        </span>
        <span>{regions.data ? `${regions.data.length} regions` : "loading regions…"}</span>
        {sources.length > 0 && <span>extracted by {sources.join(", ")}</span>}
        <label className="ml-auto flex items-center gap-1">
          show
          <select className="panel px-1 py-0.5" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
            <option value="paragraph">paragraphs</option>
            <option value="line">lines</option>
            <option value="word">words</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>
      <div className="relative min-h-0 overflow-auto border border-line bg-ground">
        {image ? (
          <div className="relative" style={{ aspectRatio: `${page.widthPx} / ${page.heightPx}` }}>
            <img src={image} alt={`Page ${page.page}`} className="block h-auto w-full select-none" draggable={false} />
            {shown.map((r) => {
              const inChunk = highlightChunkId != null && r.chunkId === highlightChunkId;
              return (
                <button
                  type="button"
                  key={r.id}
                  title={r.text}
                  aria-label={r.text || r.regionType}
                  onMouseEnter={() => setHover(r)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPickChunk(r.chunkId)}
                  className={`absolute border ${
                    inChunk
                      ? "border-ink bg-ink/15"
                      : r.regionType === "image"
                        ? "border-dashed border-sky-600/70"
                        : "border-emerald-600/60 hover:bg-emerald-500/15"
                  }`}
                  style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}
                />
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-center text-ink-muted">Loading page image…</p>
        )}
      </div>
      <p className="min-h-10 text-xs text-ink-muted">
        {hover ? (
          <>
            <span className="font-mono">{hover.regionType}</span> · {hover.source}
            {hover.confidence != null && ` · confidence ${(hover.confidence * 100).toFixed(0)}%`}
            {hover.chunkId ? " · click to show its chunk" : " · not in a chunk"}
            <span className="mt-0.5 block truncate text-ink">{hover.text}</span>
          </>
        ) : (
          "Hover a region to see how it was extracted; click one to jump to the chunk it landed in."
        )}
      </p>
    </div>
  );
}
