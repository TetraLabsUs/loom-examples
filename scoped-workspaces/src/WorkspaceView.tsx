import { ChatProvider } from "@tetralabs/loom-react/chat";
import { useOverview } from "@tetralabs/loom-react/documents";
import { useState } from "react";
import { CitationSheet, type SelectedCitation } from "./chat/CitationSheet";
import { Composer } from "./chat/Composer";
import { Thread } from "./chat/Thread";
import { EmptyState } from "./components/EmptyState";
import { FileDrop } from "./components/FileDrop";
import { StatusPill } from "./components/StatusPill";
import type { DocumentItem } from "./documents";
import { workspaceScope } from "./loom";
import { SearchPanel } from "./search/SearchPanel";
import type { Workspace } from "./workspaces";

export function WorkspaceView({
  workspace,
  documents,
  sessionId,
  onSessionChange,
  onIngest,
  onError,
}: {
  workspace: Workspace;
  documents: DocumentItem[];
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
  onIngest: (name: string, key: string) => Promise<void>;
  onError: (error: Error) => void;
}) {
  const [tab, setTab] = useState<"chat" | "search">("chat");
  const [citation, setCitation] = useState<SelectedCitation | null>(null);
  const ready = documents.some((d) => d.status === "ready");

  return (
    <main className="panel flex min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[20px] font-semibold">{workspace.name}</h1>
        <nav className="ml-auto flex gap-1">
          {(["chat", "search"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-[4px] px-3 py-1 capitalize ${tab === t ? "bg-ink text-white" : "text-ink-muted"}`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <section className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <span className="label">Documents</span>
        {documents.map((d) => (
          <span key={d.entityId} className="flex items-center gap-1.5 text-sm">
            <span className="max-w-[160px] truncate" title={d.name}>
              {d.name}
            </span>
            {d.status === "ready" ? <StatusPill status="ready" /> : <LivePill doc={d} />}
          </span>
        ))}
        <div className="ml-auto w-56">
          <FileDrop onIngest={onIngest} onError={onError} />
        </div>
      </section>

      {!ready ? (
        <EmptyState
          message={
            documents.length === 0
              ? `Drop a PDF to give ${workspace.name} its first document.`
              : "Chat and search unlock when a document is ready."
          }
        />
      ) : tab === "search" ? (
        <SearchPanel workspaceId={workspace.id} />
      ) : (
        <div className={`grid min-h-0 flex-1 ${citation ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
          {/* Controlled session: the id lives in localStorage per workspace; onChange records the one Loom creates. */}
          <ChatProvider
            options={{
              session: { mode: "controlled", id: sessionId, onChange: onSessionChange },
              scopes: [workspaceScope(workspace.id)],
              capabilities: { cancellation: true },
              onError,
            }}
          >
            <div className="flex min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Thread workspaceName={workspace.name} onSelectCitation={setCitation} />
              </div>
              <Composer workspaceName={workspace.name} documents={documents} />
            </div>
          </ChatProvider>
          {citation && (
            <div className="p-4 pl-0">
              <CitationSheet selected={citation} onClose={() => setCitation(null)} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/** Loom retries a bad file before marking it failed; the latest extraction job already carries the error. */
function LivePill({ doc }: { doc: DocumentItem }) {
  const overview = useOverview(doc.entityType, doc.entityId);
  const message = overview.data?.extractionJobs[0]?.error ?? null;
  return <StatusPill status={message ? "failed" : doc.status} message={message} />;
}
