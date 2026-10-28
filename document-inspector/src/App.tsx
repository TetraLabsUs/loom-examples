import type { LoomSearchResultChunk, LoomSource } from "@tetralabs/loom";
import { useOverview } from "@tetralabs/loom-react/documents";
import { useEffect, useState } from "react";
import { ChunkList } from "./components/ChunkList";
import { EmptyState } from "./components/EmptyState";
import { ErrorBanner } from "./components/ErrorBanner";
import { PageViewer } from "./components/PageViewer";
import { SearchBar } from "./components/SearchBar";
import { SourceRail } from "./components/SourceRail";
import { TopBar } from "./components/TopBar";

interface Target {
  entityType: string;
  entityId: string;
  sourceRef: string;
  chunkId?: string | null;
}

export function App() {
  const [target, setTarget] = useState<Target | null>(null);
  const [chunkId, setChunkId] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const overview = useOverview(target?.entityType ?? "", target?.entityId ?? "");

  const pick = (s: LoomSource) => {
    setTarget({ entityType: s.entityType, entityId: s.entityId, sourceRef: s.sourceRef });
    setChunkId(null);
    setPageNo(1);
  };
  const pickResult = (r: LoomSearchResultChunk) => {
    setTarget({ entityType: r.entityType, entityId: r.entityId, sourceRef: r.sourceRef });
    setChunkId(r.id);
  };

  // Follow the selected chunk to its page.
  useEffect(() => {
    const page = overview.data?.chunks.find((c) => c.id === chunkId)?.page;
    if (page != null) setPageNo(page);
  }, [chunkId, overview.data]);

  const pages = overview.data?.pages ?? [];
  const page = pages.find((p) => p.page === pageNo) ?? pages[0];

  return (
    <div className="flex h-screen flex-col">
      <TopBar appName="document-inspector" />
      <ErrorBanner error={overview.error} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] gap-4 p-4">
        <SourceRail selected={target} onSelect={pick} />

        <main className="flex min-h-0 min-w-0 flex-col gap-4">
          <SearchBar onPick={pickResult} />
          {!target ? (
            <div className="panel flex-1">
              <EmptyState message="Pick a document on the left, or search, to see how Loom extracted and chunked it." />
            </div>
          ) : overview.isPending ? (
            <p className="text-ink-muted">Loading document…</p>
          ) : !overview.data ? (
            <div className="panel flex-1">
              <EmptyState message="Loom has no extraction record for this document yet." />
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-baseline gap-3">
                <h1 className="truncate text-[20px] font-semibold">{target.sourceRef}</h1>
                <span className="text-xs text-ink-muted">
                  {target.entityType} / {target.entityId}
                </span>
                <span className="ml-auto text-xs text-ink-muted">
                  {overview.data.generations.length} generation{overview.data.generations.length === 1 ? "" : "s"} ·{" "}
                  {overview.data.extractionJobs.map((j) => j.status).join(", ") || "no jobs"}
                </span>
              </header>
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
                <section className="flex min-h-0 flex-col gap-2">
                  {pages.length > 1 && (
                    <nav className="flex flex-wrap gap-1">
                      {pages.map((p) => (
                        <button
                          key={p.page}
                          type="button"
                          onClick={() => setPageNo(p.page)}
                          className={`rounded-[4px] px-2 py-0.5 text-xs ${p.page === page?.page ? "bg-ink text-white" : "panel"}`}
                        >
                          {p.page}
                        </button>
                      ))}
                    </nav>
                  )}
                  {page ? (
                    <PageViewer page={page} highlightChunkId={chunkId} onPickChunk={setChunkId} />
                  ) : (
                    <div className="panel flex-1">
                      <EmptyState message="No rendered pages: this source was ingested as text, so there is nothing to overlay. Its chunks are on the right." />
                    </div>
                  )}
                </section>
                <ChunkList overview={overview.data} selectedChunkId={chunkId} onSelect={(c) => setChunkId(c.id)} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
