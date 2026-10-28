import type { LoomSource } from "@tetralabs/loom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useClient } from "@tetralabs/loom-react";
import { useSources } from "@tetralabs/loom-react/sources";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DocumentStatus } from "./components/StatusPill";
import { DOCUMENT_ENTITY_TYPE, STORAGE_PROFILE, WORKSPACE_GROUP_TYPE, workspaceScope } from "./loom";
import { useWorkspaceStore } from "./workspaces";

export interface DocumentItem {
  entityType: string;
  entityId: string;
  workspaceId: string;
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

/** All documents across workspaces in one polled query; callers filter by workspace. */
export function useDocuments() {
  const client = useClient();
  const queryClient = useQueryClient();
  const store = useWorkspaceStore();

  // Poll while anything is still moving; decided from the previous render's data.
  const busy = useRef(true);
  // `groupType` only filters when paired with a `groupId`, so list by entity type and keep our group here.
  const sources = useSources(
    { entityTypes: [DOCUMENT_ENTITY_TYPE], limit: 500 },
    { refetchInterval: busy.current ? 2000 : false },
  );

  const documents = useMemo<DocumentItem[]>(() => {
    const fromServer = (sources.data ?? [])
      .filter((s) => s.groupType === WORKSPACE_GROUP_TYPE && s.groupId)
      .map((s) => ({
        entityType: s.entityType,
        entityId: s.entityId,
        workspaceId: s.groupId as string,
        name: s.sourceRef,
        status: statusOf(s),
      }));
    const seen = new Set(fromServer.map((d) => d.entityId));
    const pending = Object.entries(store.pending).flatMap(([workspaceId, items]) =>
      items
        .filter((p) => !seen.has(p.entityId))
        .map((p) => ({
          entityType: DOCUMENT_ENTITY_TYPE,
          entityId: p.entityId,
          workspaceId,
          name: p.name,
          status: "queued" as const,
        })),
    );
    const all = [...pending, ...fromServer];
    busy.current = all.some((d) => !TERMINAL.includes(d.status));
    return all;
  }, [sources.data, store.pending]);

  useEffect(() => {
    const seen = new Set((sources.data ?? []).map((s) => s.entityId));
    for (const workspaceId of Object.keys(store.pending)) store.prunePending(workspaceId, seen);
  }, [sources.data, store.pending, store.prunePending]);

  const ingest = useCallback(
    async (workspaceId: string, name: string, key: string) => {
      const entityId = crypto.randomUUID();
      await client.sources.ingestFile({
        entityType: DOCUMENT_ENTITY_TYPE,
        entityId,
        sourceRef: name,
        storageProfile: STORAGE_PROFILE,
        key,
        contentTypeHint: "application/pdf",
        ...workspaceScope(workspaceId),
      });
      store.addPending(workspaceId, { entityId, name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sources() });
    },
    [client, queryClient, store.addPending],
  );

  return { documents, error: sources.error, ingest };
}
