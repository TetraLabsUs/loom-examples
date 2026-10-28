import type { LoomChatSession } from "@tetralabs/loom";
import { useChatSessions, useUpdateChatSession } from "@tetralabs/loom-react/chat";
import { useState } from "react";

export function SessionRail({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [status, setStatus] = useState<"active" | "archived">("active");
  const sessions = useChatSessions({ limit: 50, status });

  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label">Sessions</span>
        <button type="button" className="btn text-xs" onClick={onNew}>
          New
        </button>
      </div>
      <div className="flex gap-1 text-xs">
        {(["active", "archived"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-[4px] px-2 py-0.5 ${status === s ? "bg-ink text-white" : "text-ink-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {sessions.isPending && <p className="text-ink-muted">Loading…</p>}
      {sessions.data?.length === 0 && <p className="text-ink-muted">No {status} sessions.</p>}
      <ul className="panel min-h-0 divide-y divide-line overflow-y-auto">
        {(sessions.data ?? [])
          .slice()
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
          .map((s) => (
            <SessionRow key={s.id} session={s} selected={s.id === selectedId} onSelect={() => onSelect(s.id)} />
          ))}
      </ul>
    </aside>
  );
}

function SessionRow({ session, selected, onSelect }: { session: LoomChatSession; selected: boolean; onSelect: () => void }) {
  const update = useUpdateChatSession(session.id);
  return (
    <li className={`group flex items-center gap-1 px-2 py-1.5 ${selected ? "bg-ground" : ""}`}>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left" title={session.title ?? ""}>
        {session.isPinned && <span className="mr-1 text-ink-muted">★</span>}
        {session.title ?? "Untitled"}
        {session.forkedFromSessionId && <span className="ml-1 text-xs text-ink-muted">fork</span>}
      </button>
      <button
        type="button"
        className="text-xs text-ink-muted opacity-0 group-hover:opacity-100"
        title={session.isPinned ? "Unpin" : "Pin"}
        onClick={() => update.mutate({ isPinned: !session.isPinned })}
      >
        {session.isPinned ? "unpin" : "pin"}
      </button>
      <button
        type="button"
        className="text-xs text-ink-muted opacity-0 group-hover:opacity-100"
        title={session.isArchived ? "Restore" : "Archive"}
        onClick={() => update.mutate({ isArchived: !session.isArchived })}
      >
        {session.isArchived ? "restore" : "archive"}
      </button>
    </li>
  );
}
