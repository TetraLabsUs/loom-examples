import { useRef, useState } from "react";
import type { DocumentItem } from "../documents";
import type { Workspace } from "../workspaces";

export function WorkspaceRail({
  workspaces,
  documents,
  selectedId,
  onSelect,
  onCreate,
}: {
  workspaces: Workspace[];
  documents: DocumentItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const readyCount = (id: string) => documents.filter((d) => d.workspaceId === id && d.status === "ready").length;

  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-3">
      <span className="label">Workspaces</span>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) {
            input.current?.focus();
            return;
          }
          setName("");
          onCreate(n);
        }}
      >
        <input
          ref={input}
          aria-label="New workspace name"
          className="panel min-w-0 flex-1 px-2 py-1"
          placeholder="Name a workspace, e.g. Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn whitespace-nowrap" aria-label="Create workspace">
          Create
        </button>
      </form>
      {workspaces.length === 0 && (
        <p className="text-xs text-ink-muted">No workspaces yet. Type a name above and press Create.</p>
      )}
      {workspaces.length > 0 && (
        <ul className="panel divide-y divide-line">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                type="button"
                onClick={() => onSelect(ws.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left ${ws.id === selectedId ? "bg-ground font-medium" : ""}`}
              >
                <span className="truncate">{ws.name}</span>
                <span className="text-xs text-ink-muted">{readyCount(ws.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
