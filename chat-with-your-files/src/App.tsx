import { LoomChatComposer, LoomChatMessages, LoomChatRoot } from "@tetralabs/loom-react-ui/chat";
import { useState } from "react";
import { CitationChips, CitationPanel, type SelectedCitation } from "./components/Citations";
import { DocumentList } from "./components/DocumentList";
import { EmptyState } from "./components/EmptyState";
import { ErrorBanner } from "./components/ErrorBanner";
import { FileDrop } from "./components/FileDrop";
import { TopBar } from "./components/TopBar";
import { useDocuments } from "./documents";
import { APP_GROUP } from "./loom";

export function App() {
  const [error, setError] = useState<Error | null>(null);
  const [citation, setCitation] = useState<SelectedCitation | null>(null);
  const docs = useDocuments();
  const ready = docs.documents.some((d) => d.status === "ready");

  return (
    <div className="flex h-screen flex-col">
      <TopBar appName="chat-with-your-files" />
      <ErrorBanner error={error ?? docs.error} onDismiss={() => setError(null)} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] gap-4 p-4">
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <span className="label">Documents</span>
          <FileDrop onIngest={docs.ingest} onError={setError} />
          <DocumentList documents={docs.documents} />
        </aside>

        <main className={`grid min-h-0 gap-4 ${citation ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
          <div className="flex min-h-0 flex-col">
            <span className="label mb-3">Chat</span>
            {ready ? (
              // Retrieval is scoped to this app's group, so answers only come from these files.
              <LoomChatRoot
                options={{
                  session: { mode: "uncontrolled", initialId: null },
                  scopes: [APP_GROUP],
                  capabilities: { cancellation: true },
                  onError: setError,
                }}
              >
                <section className="loom-chat !w-full flex-1 !grid-rows-[1fr_auto_auto]">
                  <LoomChatMessages />
                  <CitationChips onSelect={setCitation} />
                  <LoomChatComposer placeholder="Ask about your documents…" />
                </section>
              </LoomChatRoot>
            ) : (
              <div className="panel flex-1">
                <EmptyState
                  message={
                    docs.documents.length === 0
                      ? "Drop a PDF to ingest your first document."
                      : "Chat unlocks when a document is ready."
                  }
                />
              </div>
            )}
          </div>
          {citation && <CitationPanel selected={citation} onClose={() => setCitation(null)} />}
        </main>
      </div>
    </div>
  );
}
