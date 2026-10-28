import type { LoomChatRunEvent, LoomChatStreamHandlers, LoomToolExecution } from "@tetralabs/loom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@tetralabs/loom-react";
import { useCreateChatSession, useSendChatMessage } from "@tetralabs/loom-react/chat";
import { useRef, useState } from "react";

interface LiveEvent {
  at: number;
  kind: "trace" | "tool" | "reasoning" | "delta" | "approval";
  text: string;
}

/**
 * One streamed turn, with the server's trace events shown as they arrive
 * (`includeTrace: true`). When the run finishes the recorded trace is opened.
 */
export function Ask({
  sessionId,
  onSession,
  onRun,
}: {
  sessionId: string | null;
  onSession: (id: string) => void;
  onRun: (runId: string) => void;
}) {
  const queryClient = useQueryClient();
  const create = useCreateChatSession();
  const send = useSendChatMessage();
  const [prompt, setPrompt] = useState("");
  const [live, setLive] = useState<LiveEvent[]>([]);
  const [answer, setAnswer] = useState("");
  const busy = create.isPending || send.isPending;
  const error = create.error ?? send.error;

  const start = useRef(0);
  const push = (kind: LiveEvent["kind"], text: string) =>
    setLive((l) => {
      const at = Date.now() - start.current;
      const last = l[l.length - 1];
      // Reasoning arrives token by token; keep it on one line.
      if (kind === "reasoning" && last?.kind === "reasoning") {
        return [...l.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...l, { at, kind, text }];
    });
  const invalidate = (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRuns(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions() }),
    ]);
  const handlers: LoomChatStreamHandlers = {
    onTrace: (e: LoomChatRunEvent) => push("trace", e.type),
    onToolExecution: (t: LoomToolExecution) => push("tool", `${t.toolName} → ${t.status} (${t.durationMs} ms, policy ${t.policyAction})`),
    onReasoningDelta: (d) => push("reasoning", d),
    onDelta: (d) => setAnswer((a) => a + d),
    onConfirmationRequired: (_runId, approvals) => push("approval", approvals.map((a) => a.title).join(", ")),
    onDone: (m, citations, runId) => {
      push("trace", `done · ${citations.length} citation(s)`);
      void invalidate(m.sessionId).then(() => onRun(runId));
      // The run row is finalised just after the stream's last event.
      setTimeout(() => void invalidate(m.sessionId), 1500);
    },
  };

  function submit() {
    const content = prompt.trim();
    if (!content || busy) return;
    start.current = Date.now();
    setLive([]);
    setAnswer("");
    setPrompt("");
    if (sessionId) {
      send.mutate({ sessionId, content, includeTrace: true, handlers });
    } else {
      create.mutate({
        prompt: content,
        includeTrace: true,
        handlers: { ...handlers, onSession: (s) => onSession(s.id) },
      });
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line p-4">
      {(live.length > 0 || answer) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ol className="panel max-h-40 overflow-y-auto p-2 font-mono">
            {live.map((e, i) => (
              <li key={i} className={e.kind === "tool" ? "text-ink" : "text-ink-muted"}>
                <span className="tabular-nums">+{(e.at / 1000).toFixed(2)}s</span> {e.kind === "trace" ? "" : `${e.kind}: `}
                {e.text}
              </li>
            ))}
          </ol>
          <p className="panel max-h-40 overflow-y-auto whitespace-pre-wrap p-2">{answer || "…"}</p>
        </div>
      )}
      {error && <p className="text-sm text-red-800">{error.message}</p>}
      <form
        className="panel flex items-end gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          aria-label="Prompt"
          rows={2}
          className="flex-1 resize-none bg-transparent p-1 outline-none"
          placeholder={sessionId ? "Ask a follow-up and watch the trace…" : "Ask something to start a new session…"}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="btn" disabled={busy || !prompt.trim()}>
          {busy ? "Running…" : "Send"}
        </button>
      </form>
    </div>
  );
}
