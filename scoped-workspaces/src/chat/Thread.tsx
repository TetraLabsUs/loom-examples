import type { LoomChatCitation, LoomChatCitationChunk } from "@tetralabs/loom";
import { useChatState } from "@tetralabs/loom-react/chat";
import { useEffect, useRef } from "react";
import type { SelectedCitation } from "./CitationSheet";
import { splitContext } from "./context";

/** The workspace's conversation, in the app's own markup, from `useChatState`. */
export function Thread({
  workspaceName,
  onSelectCitation,
}: {
  workspaceName: string;
  onSelectCitation: (c: SelectedCitation) => void;
}) {
  const { messages, queries, isStreaming } = useChatState();
  const bottom = useRef<HTMLDivElement>(null);

  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, lastContent]);

  if (queries.messages.isPending && messages.length === 0) {
    return <p className="p-4 text-ink-muted">Loading conversation…</p>;
  }
  if (messages.length === 0) {
    return <p className="p-4 text-center text-ink-muted">Ask {workspaceName} a question about its documents.</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4" aria-live="polite">
      {messages.map((m) => {
        const user = m.role === "user";
        const streaming = m.state === "streaming";
        const { text, context } = user ? splitContext(m.content) : { text: m.content, context: null };
        return (
          <article
            key={m.id}
            className={`max-w-[80%] rounded-[4px] px-3 py-2 ${user ? "self-end bg-ground" : "panel self-start"}`}
            data-role={m.role}
            title={context ? `Sent with context: ${context}` : undefined}
          >
            <p className="whitespace-pre-wrap">
              {text}
              {streaming && isStreaming && (
                <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-ink align-text-bottom" />
              )}
            </p>
            {!user && m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.citations.map((citation, i) => (
                  <CitationChip key={`${m.id}-${i}`} citation={citation} index={i + 1} onSelect={onSelectCitation} />
                ))}
              </div>
            )}
          </article>
        );
      })}
      <div ref={bottom} />
    </div>
  );
}

function CitationChip({
  citation,
  index,
  onSelect,
}: {
  citation: LoomChatCitation;
  index: number;
  onSelect: (c: SelectedCitation) => void;
}) {
  const chunk: LoomChatCitationChunk | undefined = citation.chunks[0];
  return (
    <button
      type="button"
      className="rounded border border-line bg-panel px-2 py-0.5 text-xs hover:border-ink"
      onClick={() => chunk && onSelect({ citation, chunk, index })}
    >
      [{index}] {citation.sourceRef}
      {chunk?.page != null ? ` p.${chunk.page}` : ""}
    </button>
  );
}
