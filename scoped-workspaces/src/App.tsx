import { useState } from "react";
import { ErrorBanner } from "./components/ErrorBanner";
import { TopBar } from "./components/TopBar";
import { WorkspaceRail } from "./components/WorkspaceRail";
import { useDocuments } from "./documents";
import { WorkspaceView } from "./WorkspaceView";
import { useWorkspaceStore } from "./workspaces";

export function App() {
  const [error, setError] = useState<Error | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const store = useWorkspaceStore();
  const docs = useDocuments();
  const selected = store.workspaces.find((w) => w.id === selectedId) ?? store.workspaces[0] ?? null;

  return (
    <div className="flex h-screen flex-col">
      <TopBar appName="scoped-workspaces" />
      <ErrorBanner error={error ?? docs.error} onDismiss={() => setError(null)} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] gap-4 p-4">
        <WorkspaceRail
          workspaces={store.workspaces}
          documents={docs.documents}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onCreate={(name) => setSelectedId(store.createWorkspace(name).id)}
        />
        {selected ? (
          // Keyed by workspace so the chat controller remounts with that workspace's session.
          <WorkspaceView
            key={selected.id}
            workspace={selected}
            documents={docs.documents.filter((d) => d.workspaceId === selected.id)}
            sessionId={store.sessions[selected.id] ?? null}
            onSessionChange={(id) => store.setSession(selected.id, id)}
            onIngest={(name, key) => docs.ingest(selected.id, name, key)}
            onError={setError}
          />
        ) : (
          <main className="panel">
            <p className="flex h-full items-center justify-center text-ink-muted">
              Create your first workspace. It stands in for a customer, a project or a site in your product.
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
