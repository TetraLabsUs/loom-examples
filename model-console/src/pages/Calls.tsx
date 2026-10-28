import type { LlmCall } from "@tetralabs/loom/admin";
import { useLlmCalls } from "@tetralabs/loom-react/admin";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";

export function Calls() {
  const [model, setModel] = useState("");
  const calls = useLlmCalls({ limit: 500, ...(model ? { model } : {}) });
  const all = useLlmCalls({ limit: 500 });

  const modelNames = useMemo(() => [...new Set((all.data ?? []).map((c) => c.model))].sort(), [all.data]);

  if (calls.isPending) return <p className="p-4 text-ink-muted">Loading calls…</p>;
  if (calls.error) return <ErrorBanner error={calls.error} />;
  if (calls.data.length === 0 && !model) {
    return <EmptyState message="No LLM calls yet. Run a chat or an ingest in another example, then refresh." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <TokensPerModel calls={all.data ?? []} />
        <label className="flex items-center gap-2">
          <span className="label">Model</span>
          <select className="panel px-2 py-1" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">all</option>
            {modelNames.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="panel w-full text-left">
        <thead className="label">
          <tr className="border-b border-line">
            <th className="px-3 py-2 font-normal">Time</th>
            <th className="px-3 py-2 font-normal">Use case</th>
            <th className="px-3 py-2 font-normal">Model</th>
            <th className="px-3 py-2 text-right font-normal">Tokens in</th>
            <th className="px-3 py-2 text-right font-normal">Tokens out</th>
            <th className="px-3 py-2 text-right font-normal">Latency</th>
            <th className="px-3 py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {calls.data.map((c) => (
            <tr key={c.id} className={c.status === "error" ? "text-red-800" : ""}>
              <td className="px-3 py-1.5 whitespace-nowrap text-ink-muted">{new Date(c.createdAt).toLocaleString()}</td>
              <td className="px-3 py-1.5">{c.purpose}</td>
              <td className="px-3 py-1.5">
                {c.model}
                <span className="ml-1 text-xs text-ink-muted">{c.provider}</span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmt(c.promptTokens)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {fmt(c.completionTokens)}
                {c.tokensEstimated && <span title="estimated (streamed call)"> ~</span>}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{c.latencyMs} ms</td>
              <td className="px-3 py-1.5" title={c.error ?? undefined}>
                {c.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString());

/** Total tokens per model over the last 24 hours, computed client-side. No chart library. */
function TokensPerModel({ calls }: { calls: LlmCall[] }) {
  const since = Date.now() - 24 * 3_600_000;
  const totals = new Map<string, number>();
  for (const c of calls) {
    if (new Date(c.createdAt).getTime() < since) continue;
    totals.set(c.model, (totals.get(c.model) ?? 0) + (c.totalTokens ?? 0));
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  const barH = 18;
  const labelW = 160;
  const width = 560;

  return (
    <figure className="panel flex-1 p-3">
      <figcaption className="label mb-2">Tokens per model · last 24 h</figcaption>
      {rows.length === 0 ? (
        <p className="text-ink-muted">No calls in the last 24 hours.</p>
      ) : (
        <svg width={width} height={rows.length * (barH + 6)} role="img" aria-label="Tokens per model">
          {rows.map(([name, value], i) => {
            const y = i * (barH + 6);
            const w = ((width - labelW - 70) * value) / max;
            return (
              <g key={name} transform={`translate(0 ${y})`}>
                <text x={labelW - 8} y={barH / 2} dominantBaseline="middle" textAnchor="end" fontSize={12}>
                  {name}
                </text>
                <rect x={labelW} y={0} width={w} height={barH} fill="#041522" />
                <text x={labelW + w + 6} y={barH / 2} dominantBaseline="middle" fontSize={12} fill="#64748b">
                  {value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}
