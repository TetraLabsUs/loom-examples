import type { LoomSource } from "@tetralabs/loom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useClient } from "@tetralabs/loom-react";
import { useSources } from "@tetralabs/loom-react/sources";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { DocumentStatus } from "./components/StatusPill";
import { APP_GROUP, DOCUMENT_ENTITY_TYPE, STORAGE_PROFILE } from "./loom";

export interface DocumentItem {
  entityType: string;
  entityId: string;
  name: string;
  status: DocumentStatus;
}

export function statusOf(source: LoomSource): DocumentStatus {
  if (source.failedJobs > 0) return "failed";
  if (source.processingJobs > 0) return "processing";
  if (source.pendingJobs > 0) return "queued";
  return source.chunkCount > 0 || source.completedJobs > 0 ? "ready" : "queued";
}

const TERMINAL: DocumentStatus[] = ["ready", "failed"];

/**
 * Loom creates the source row once extraction starts, so a just-ingested file
 * is remembered locally (as `queued`) until it appears in the list.
 */
const PENDING_KEY = "chat-with-your-files.pending";
type Pending = { entityId: string; name: string };
const listeners = new Set<() => void>();
function readPending(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writePending(items: Pending[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}
let pendingCache = readPending();
let pendingRaw = JSON.stringify(pendingCache);
function getPending() {
  const raw = localStorage.getItem(PENDING_KEY) ?? "[]";
  if (raw !== pendingRaw) {
    pendingRaw = raw;
    pendingCache = readPending();
  }
  return pendingCache;
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDocuments() {
  const client = useClient();
  const queryClient = useQueryClient();
  const pending = useSyncExternalStore(subscribe, getPending);

  // Poll while anything is still moving; decided from the previous render's data.
  const busy = useRef(true);
  const sources = useSources(
    { ...APP_GROUP, entityTypes: [DOCUMENT_ENTITY_TYPE], limit: 200 },
    { refetchInterval: busy.current ? 2000 : false },
  );

  const documents = useMemo<DocumentItem[]>(() => {
    const rows = sources.data ?? [];
    const seen = new Set(rows.map((s) => s.entityId));
    const fromServer = rows.map((s) => ({
      entityType: s.entityType,
      entityId: s.entityId,
      name: s.sourceRef,
      status: statusOf(s),
    }));
    const stillPending = pending.filter((p) => !seen.has(p.entityId));
    busy.current =
      stillPending.length > 0 || fromServer.some((d) => !TERMINAL.includes(d.status));
    return [
      ...stillPending.map((p) => ({
        entityType: DOCUMENT_ENTITY_TYPE,
        entityId: p.entityId,
        name: p.name,
        status: "queued" as const,
      })),
      ...fromServer,
    ];
  }, [sources.data, pending]);

  // Forget local placeholders once the server knows the document.
  useEffect(() => {
    const seen = new Set((sources.data ?? []).map((s) => s.entityId));
    const stillPending = pending.filter((p) => !seen.has(p.entityId));
    if (stillPending.length !== pending.length) writePending(stillPending);
  }, [sources.data, pending]);

  const ingest = useCallback(
    async (name: string, key: string) => {
      const entityId = crypto.randomUUID();
      await client.sources.ingestFile({
        entityType: DOCUMENT_ENTITY_TYPE,
        entityId,
        sourceRef: name,
        storageProfile: STORAGE_PROFILE,
        key,
        contentTypeHint: "application/pdf",
        ...APP_GROUP,
      });
      writePending([...getPending(), { entityId, name }]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sources() });
    },
    [client, queryClient],
  );

  return { documents, isPending: sources.isPending, error: sources.error, ingest };
}
