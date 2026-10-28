import type { LoomChatAgentRun, LoomChatCitation, LoomChatMessage } from "@tetralabs/loom";
import { useChatMessages, useChatRuns, useForkChatSession } from "@tetralabs/loom-react/chat";
import { useOverview } from "@tetralabs/loom-react/documents";
import { Fragment, useState } from "react";

/** Messages with the run behind each assistant turn; click a turn to open its trace. */
export function Transcript({
  sessionId,
  selectedRunId,
  onSelectRun,
  onForked,
}: {
  sessionId: string;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onForked: (sessionId: string) => void;
}) {
  const messages = useChatMessages(sessionId);
  const runs = useChatRuns(sessionId);
  const fork = useForkChatSession();
  // One open citation at a time, keyed by message so it survives re-sorting.
  const [openCitation, setOpenCitation] = useState<{ messageId: string; index: number } | null>(null);
  const toggleCitation = (messageId: string, index: number) =>
    setOpenCitation((cur) => (cur?.messageId === messageId && cur.index === index ? null : { messageId, index }));

  if (messages.isPending) return <p className="p-4 text-ink-muted">Loading transcript…</p>;
  if (messages.error) return <p className="p-4 text-red-800">{messages.error.message}</p>;

  // Forked sessions copy messages with one timestamp, so break ties with the role.
  const ordered = [...messages.data.messages].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || (a.role === "user" ? -1 : 1),
  );
  // A run knows its user message from the start and its assistant message only at the end.
  const runFor = (m: LoomChatMessage): LoomChatAgentRun | undefined => {
    const byAssistant = runs.data?.find((r) => r.assistantMessageId === m.id);
    if (byAssistant) return byAssistant;
    const i = ordered.indexOf(m);
    const user = ordered.slice(0, i).reverse().find((x) => x.role === "user");
    return user && runs.data?.find((r) => r.userMessageId === user.id);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {ordered.map((m) => {
        const run = m.role === "assistant" ? runFor(m) : undefined;
        const selected = run && run.id === selectedRunId;
        const citations = (m.role === "assistant" && m.citations) || [];
        const open = openCitation?.messageId === m.id ? openCitation.index : null;
        return (
          <article
            key={m.id}
            data-role={m.role}
            className={`max-w-[85%] rounded-[4px] px-3 py-2 ${m.role === "user" ? "self-end bg-ground" : `panel self-start ${selected ? "border-ink" : ""}`}`}
          >
            <p className="whitespace-pre-wrap">
              {citations.length > 0 ? (
                <CitedText
                  content={m.content}
                  citations={citations}
                  open={open}
                  onToggle={(i) => toggleCitation(m.id, i)}
                />
              ) : (
                m.content
              )}
            </p>
            {citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {citations.map((c, i) => (
                  <button
                    key={`${m.id}-${i}`}
                    type="button"
                    aria-pressed={open === i + 1}
                    className={`rounded border bg-panel px-2 py-0.5 text-xs hover:border-ink ${open === i + 1 ? "border-ink" : "border-line"}`}
                    onClick={() => toggleCitation(m.id, i + 1)}
                  >
                    [{i + 1}] {c.sourceRef}
                    {c.chunks[0]?.page != null ? ` p.${c.chunks[0].page}` : ""}
                  </button>
                ))}
              </div>
            )}
            {open != null && citations[open - 1] && (
              <CitationDetail
                citation={citations[open - 1]}
                index={open}
                onClose={() => setOpenCitation(null)}
              />
            )}
            {m.role === "assistant" && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                {run ? (
                  <button type="button" className="underline" onClick={() => onSelectRun(run.id)}>
                    {selected ? "trace shown" : "show trace"} · {run.status} · {run.iterations} iter · {run.toolCallCount} tool
                    {run.toolCallCount === 1 ? "" : "s"}
                  </button>
                ) : (
                  <span>no run recorded</span>
                )}
                <button
                  type="button"
                  className="underline"
                  disabled={fork.isPending}
                  title="Start a new session that copies the conversation up to here"
                  onClick={() =>
                    fork.mutate({ sessionId, messageId: m.id }, { onSuccess: (r) => onForked(r.session.id) })
                  }
                >
                  fork from here
                </button>
              </div>
            )}
          </article>
        );
      })}
      {ordered.length === 0 && <p className="text-center text-ink-muted">Empty session.</p>}
    </div>
  );
}

// The model writes citations as 【n】 or [n], 1-based into the message's citation list.
const MARKER = /(【\s*\d+\s*】|\[\d+\])/g;
const IS_MARKER = /^(【\s*\d+\s*】|\[\d+\])$/;

function CitedText({
  content,
  citations,
  open,
  onToggle,
}: {
  content: string;
  citations: LoomChatCitation[];
  open: number | null;
  onToggle: (index: number) => void;
}) {
  return (
    <>
      {content.split(MARKER).map((part, i) => {
        const n = IS_MARKER.test(part) ? Number(part.replace(/\D/g, "")) : NaN;
        const citation = citations[n - 1];
        if (!citation) return <Fragment key={i}>{part}</Fragment>;
        return (
          <button
            key={i}
            type="button"
            aria-pressed={open === n}
            title={citation.sourceRef}
            className={`mx-0.5 rounded px-1 align-baseline text-xs underline decoration-dotted hover:bg-ground ${open === n ? "bg-ground font-semibold" : ""}`}
            onClick={() => onToggle(n)}
          >
            [{n}]
          </button>
        );
      })}
    </>
  );
}

/** The cited chunk's text, fetched from the source document's overview. */
function CitationDetail({
  citation,
  index,
  onClose,
}: {
  citation: LoomChatCitation;
  index: number;
  onClose: () => void;
}) {
  const chunk = citation.chunks[0];
  const overview = useOverview(citation.entityType, citation.entityId);
  const text = overview.data?.chunks.find((c) => c.id === chunk?.chunkId)?.content;
  return (
    <div className="mt-2 rounded border border-line bg-ground p-2 text-sm">
      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>
          [{index}] {citation.sourceRef}
          {chunk?.page != null ? ` · page ${chunk.page}` : ""}
        </span>
        <button type="button" className="underline" onClick={onClose}>
          close
        </button>
      </div>
      {overview.isPending && <p className="mt-1 text-ink-muted">Loading…</p>}
      {overview.error && <p className="mt-1 text-red-800">{overview.error.message}</p>}
      {text ? (
        <blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-ink pl-2">{text}</blockquote>
      ) : (
        !overview.isPending && !overview.error && <p className="mt-1 text-ink-muted">Chunk text not available.</p>
      )}
    </div>
  );
}
