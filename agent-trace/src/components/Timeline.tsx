import type { LoomChatRunEvent, LoomChatRunReplay } from "@tetralabs/loom";
import { useChatRun } from "@tetralabs/loom-react/chat";
import { useState } from "react";

/** Everything Loom recorded about one agent run, from a single `chatRuns.get` call. */
export function Timeline({ sessionId, runId }: { sessionId: string; runId: string }) {
  const replay = useChatRun(sessionId, runId);
  if (replay.isPending) return <p className="p-4 text-ink-muted">Loading trace…</p>;
  if (replay.error) return <p className="p-4 text-red-800">{replay.error.message}</p>;
  const r = replay.data;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Summary replay={r} />
      <section>
        <h3 className="label mb-2">Events ({r.events.length})</h3>
        <ol className="panel divide-y divide-line">
          {r.events.map((e) => (
            <EventRow key={e.id} event={e} startedAt={r.run.startedAt} />
          ))}
        </ol>
      </section>
      {r.toolCalls.length > 0 && (
        <section>
          <h3 className="label mb-2">Tool calls</h3>
          <ul className="flex flex-col gap-2">
            {r.toolCalls.map((t) => {
              const policy = r.policyDecisions.find((p) => p.toolCallId === t.id);
              return (
                <li key={t.id} className="panel p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{t.toolName}</span>
                    <span className="text-ink-muted">{t.status} · {t.durationMs} ms</span>
                    {policy && (
                      <span className="rounded-full bg-ground px-2 text-xs" title={policy.reason}>
                        policy: {policy.decision}
                        {policy.ruleId ? ` (${policy.ruleId})` : ""}
                      </span>
                    )}
                  </div>
                  <Json label="arguments" value={t.arguments} />
                  {t.result != null && <Json label="result" value={t.result} collapsed />}
                  {t.error && <p className="mt-1 text-red-800">{t.error}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {r.approvals.length > 0 && (
        <section>
          <h3 className="label mb-2">Approvals</h3>
          <ul className="panel divide-y divide-line text-sm">
            {r.approvals.map((a) => (
              <li key={a.id} className="px-3 py-2">
                <span className="font-medium">{a.title}</span> · {a.status} · risk {a.risk}
                {a.reason && <span className="text-ink-muted"> · {a.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3 className="label mb-2">LLM calls</h3>
        <table className="panel w-full text-left text-sm">
          <thead className="label">
            <tr className="border-b border-line">
              <th className="px-3 py-1.5 font-normal">Purpose</th>
              <th className="px-3 py-1.5 font-normal">Model</th>
              <th className="px-3 py-1.5 text-right font-normal">In</th>
              <th className="px-3 py-1.5 text-right font-normal">Out</th>
              <th className="px-3 py-1.5 text-right font-normal">Latency</th>
              <th className="px-3 py-1.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.llmCalls.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-1.5">{c.purpose}</td>
                <td className="px-3 py-1.5">
                  {c.model} <span className="text-xs text-ink-muted">{c.provider}</span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{c.promptTokens ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {c.completionTokens ?? "—"}
                  {c.tokensEstimated && <span title="estimated (streamed)">~</span>}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{c.latencyMs} ms</td>
                <td className="px-3 py-1.5" title={c.error ?? undefined}>
                  {c.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Summary({ replay: r }: { replay: LoomChatRunReplay }) {
  const tokens = r.llmCalls.reduce((n, c) => n + (c.totalTokens ?? 0), 0);
  const wall = r.run.completedAt ? new Date(r.run.completedAt).getTime() - new Date(r.run.startedAt).getTime() : null;
  const cells: [string, string][] = [
    ["status", r.run.status],
    ["iterations", String(r.run.iterations)],
    ["tool calls", String(r.run.toolCallCount)],
    ["LLM calls", String(r.llmCalls.length)],
    ["tokens", tokens.toLocaleString()],
    ["wall time", wall == null ? "—" : `${(wall / 1000).toFixed(1)} s`],
    ["trace", r.traceCompleteness],
  ];
  return (
    <dl className="panel grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-px overflow-hidden bg-line text-sm">
      {cells.map(([k, v]) => (
        <div key={k} className="bg-panel px-3 py-2">
          <dt className="label">{k}</dt>
          <dd className="truncate" title={v}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EventRow({ event, startedAt }: { event: LoomChatRunEvent; startedAt: string }) {
  const [open, setOpen] = useState(false);
  const t = (new Date(event.createdAt).getTime() - new Date(startedAt).getTime()) / 1000;
  return (
    <li className="px-3 py-1.5 text-sm">
      <button type="button" className="flex w-full items-baseline gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="w-14 shrink-0 tabular-nums text-ink-muted">+{t.toFixed(2)}s</span>
        <span className="w-48 shrink-0 font-mono text-xs">{event.type}</span>
        <span className="min-w-0 flex-1 truncate text-ink-muted">{summarize(event)}</span>
        {event.iteration != null && <span className="text-xs text-ink-muted">iter {event.iteration}</span>}
      </button>
      {open && <Json value={event.payload} />}
    </li>
  );
}

function summarize(e: LoomChatRunEvent): string {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const pick = ["tool_name", "action", "purpose", "content", "goal", "citation_count", "duration_ms", "reason", "error"];
  return pick
    .filter((k) => p[k] != null)
    .map((k) => `${k}: ${typeof p[k] === "string" ? p[k] : JSON.stringify(p[k])}`)
    .join(" · ");
}

function Json({ label, value, collapsed = false }: { label?: string; value: unknown; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div className="mt-1 text-xs">
      {label && (
        <button type="button" className="label" onClick={() => setOpen((o) => !o)}>
          {label} {open ? "▾" : "▸"}
        </button>
      )}
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-[4px] bg-ground p-2 font-mono">{JSON.stringify(value, null, 2)}</pre>
      )}
    </div>
  );
}
