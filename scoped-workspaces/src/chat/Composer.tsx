import { useChatActions, useChatState } from "@tetralabs/loom-react/chat";
import { useState } from "react";
import type { DocumentItem } from "../documents";
import { withWorkspaceContext } from "./context";

/** Send, or Stop while an answer streams. The partial message stays. */
export function Composer({ workspaceName, documents }: { workspaceName: string; documents: DocumentItem[] }) {
  const { send, cancel } = useChatActions();
  const { isInputLocked, isStreaming, isStopping, cancellableRunId } = useChatState();
  const [draft, setDraft] = useState("");
  const canStop = isStreaming && Boolean(cancellableRunId);

  return (
    <form
      className="panel m-4 mt-0 flex items-end gap-2 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || isInputLocked) return;
        setDraft("");
        void send(withWorkspaceContext(content, workspaceName, documents)).then((r) => {
          if (!r.ok) {
            console.error("send failed", r.error);
            setDraft(content);
          }
        });
      }}
    >
      <textarea
        aria-label="Message"
        rows={2}
        className="flex-1 resize-none bg-transparent p-1 outline-none"
        placeholder={`Ask ${workspaceName}…`}
        value={draft}
        disabled={isInputLocked}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {canStop ? (
        <button type="button" className="btn" disabled={isStopping} onClick={() => void cancel()}>
          {isStopping ? "Stopping…" : "Stop"}
        </button>
      ) : (
        <button type="submit" className="btn" disabled={isInputLocked || !draft.trim()}>
          Send
        </button>
      )}
    </form>
  );
}
