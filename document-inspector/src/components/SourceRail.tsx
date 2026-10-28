import type { LoomSource } from "@tetralabs/loom";
import { useEntityTypes, useSources } from "@tetralabs/loom-react/sources";
import { useState } from "react";

export type Status = "queued" | "processing" | "ready" | "failed";
export function statusOf(s: LoomSource): Status {
  if (s.failedJobs > 0) return "failed";
  if (s.processingJobs > 0) return "processing";
  if (s.pendingJobs > 0) return "queued";
  return s.chunkCount > 0 || s.completedJobs > 0 ? "ready" : "queued";
}

/** Every ingested source on the tenant, filterable by entity type and text. */
export function SourceRail({
  selected,
  onSelect,
}: {
  selected: { entityType: string; entityId: string } | null;
  onSelect: (s: LoomSource) => void;
}) {
  const [entityType, setEntityType] = useState("");
  const [q, setQ] = useState("");
  const types = useEntityTypes();
  const sources = useSources({
    limit: 200,
    ...(entityType ? { entityTypes: [entityType] } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
  });

  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-3">
      <span className="label">Documents</span>
      <select className="panel px-2 py-1" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="">all entity types</option>
        {(types.data ?? []).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        aria-label="Filter documents"
        className="panel px-2 py-1"
        placeholder="Filter by name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {sources.isPending && <p className="text-ink-muted">Loading…</p>}
      {sources.error && <p className="text-red-800">{sources.error.message}</p>}
      {sources.data?.length === 0 && <p className="text-ink-muted">No documents match.</p>}
      <ul className="panel min-h-0 divide-y divide-line overflow-y-auto">
        {(sources.data ?? []).map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left ${
                selected?.entityType === s.entityType && selected?.entityId === s.entityId ? "bg-ground" : ""
              }`}
            >
              <span className="w-full truncate" title={s.sourceRef}>
                {s.sourceRef}
              </span>
              <span className="flex w-full justify-between text-xs text-ink-muted">
                <span className="truncate">
                  {s.entityType} · {s.contentType.replace("application/", "")}
                </span>
                <span>
                  {s.chunkCount} chunk{s.chunkCount === 1 ? "" : "s"} · {statusOf(s)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
