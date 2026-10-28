import { useCallback, useSyncExternalStore } from "react";

/** A workspace stands in for your own entity: a customer, a project, a site. */
export interface Workspace {
  id: string;
  name: string;
}

interface Store {
  workspaces: Workspace[];
  /** One chat session per workspace, kept across reloads. */
  sessions: Record<string, string>;
  /** Files ingested but not yet listed by Loom (it creates the source row when extraction starts). */
  pending: Record<string, { entityId: string; name: string }[]>;
}

const KEY = "scoped-workspaces";
const empty: Store = { workspaces: [], sessions: {}, pending: {} };
const listeners = new Set<() => void>();
let cache: Store = read();

function read(): Store {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return empty;
  }
}
function write(next: Store) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useWorkspaceStore() {
  const store = useSyncExternalStore(subscribe, () => cache);

  const createWorkspace = useCallback((name: string) => {
    const ws = { id: crypto.randomUUID(), name };
    write({ ...cache, workspaces: [...cache.workspaces, ws] });
    return ws;
  }, []);

  const setSession = useCallback((workspaceId: string, sessionId: string | null) => {
    const sessions = { ...cache.sessions };
    if (sessionId) sessions[workspaceId] = sessionId;
    else delete sessions[workspaceId];
    write({ ...cache, sessions });
  }, []);

  const addPending = useCallback((workspaceId: string, item: { entityId: string; name: string }) => {
    const list = cache.pending[workspaceId] ?? [];
    write({ ...cache, pending: { ...cache.pending, [workspaceId]: [...list, item] } });
  }, []);

  const prunePending = useCallback((workspaceId: string, knownEntityIds: Set<string>) => {
    const list = cache.pending[workspaceId] ?? [];
    const next = list.filter((p) => !knownEntityIds.has(p.entityId));
    if (next.length !== list.length) {
      write({ ...cache, pending: { ...cache.pending, [workspaceId]: next } });
    }
  }, []);

  return { ...store, createWorkspace, setSession, addPending, prunePending };
}
