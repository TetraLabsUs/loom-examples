import { useState } from "react";
import { Ask } from "./components/Ask";
import { EmptyState } from "./components/EmptyState";
import { SessionRail } from "./components/SessionRail";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { Transcript } from "./components/Transcript";

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const select = (id: string | null) => {
    setSessionId(id);
    setRunId(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <TopBar appName="agent-trace" />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_1fr] gap-4 p-4">
        <SessionRail selectedId={sessionId} onSelect={select} onNew={() => select(null)} />
        <main className="panel flex min-h-0 min-w-0 flex-col">
          <span className="label border-b border-line px-4 py-2">Transcript</span>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sessionId ? (
              <Transcript sessionId={sessionId} selectedRunId={runId} onSelectRun={setRunId} onForked={select} />
            ) : (
              <EmptyState message="Pick a session, or ask something below to start one and watch its trace live." />
            )}
          </div>
          <Ask sessionId={sessionId} onSession={setSessionId} onRun={setRunId} />
        </main>

        <section className="panel flex min-h-0 min-w-0 flex-col">
          <span className="label border-b border-line px-4 py-2">Run trace</span>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sessionId && runId ? (
              <Timeline sessionId={sessionId} runId={runId} />
            ) : (
              <EmptyState message="Click “show trace” on an assistant turn to see its events, tool calls, policy decisions and LLM calls." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
