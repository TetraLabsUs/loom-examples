import type { LoomLlmModel, LoomLlmModelTestResult } from "@tetralabs/loom/admin";
import { useLlmModels, useLlmUseCases, useTestLlmModel } from "@tetralabs/loom-react/admin";
import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";

export function Models() {
  const models = useLlmModels();
  const useCases = useLlmUseCases();
  const defaultsFor = (modelId: string) =>
    (useCases.data ?? []).filter((u) => u.default?.modelId === modelId).map((u) => u.useCase);

  if (models.isPending) return <p className="p-4 text-ink-muted">Loading models…</p>;
  if (models.error) return <ErrorBanner error={models.error} />;
  if (models.data.length === 0) {
    return (
      <EmptyState message="No models registered yet. Register one in the admin console, then come back and test it here." />
    );
  }

  return (
    <table className="panel w-full text-left">
      <thead className="label">
        <tr className="border-b border-line">
          <th className="px-3 py-2 font-normal">Model</th>
          <th className="px-3 py-2 font-normal">Kind</th>
          <th className="px-3 py-2 font-normal">Provider</th>
          <th className="px-3 py-2 font-normal">Default for</th>
          <th className="px-3 py-2 font-normal">Last test</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {models.data.map((m) => (
          <ModelRow key={m.id} model={m} defaultFor={defaultsFor(m.id)} />
        ))}
      </tbody>
    </table>
  );
}

function ModelRow({ model, defaultFor }: { model: LoomLlmModel; defaultFor: string[] }) {
  const test = useTestLlmModel(model.id);
  const [result, setResult] = useState<LoomLlmModelTestResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  return (
    <tr className={model.enabled ? "" : "text-ink-muted"}>
      <td className="px-3 py-2">
        <div>{model.name}</div>
        <div className="text-xs text-ink-muted">{model.model}</div>
      </td>
      <td className="px-3 py-2">{model.kind}</td>
      <td className="px-3 py-2">{model.provider}</td>
      <td className="px-3 py-2">{defaultFor.length ? defaultFor.join(", ") : "—"}</td>
      <td className="px-3 py-2">
        {test.isPending && <span className="text-ink-muted">testing…</span>}
        {!test.isPending && result && (
          <span className={result.success ? "text-emerald-700" : "text-red-700"}>
            {result.success ? "ok" : "failed"} {result.latencyMs} ms
            <span className="block max-w-[320px] truncate text-xs text-ink-muted" title={result.message}>
              {result.message}
            </span>
          </span>
        )}
        {!test.isPending && error && (
          <span className="text-red-700">
            error
            <span className="block max-w-[320px] truncate text-xs" title={error.message}>
              {error.message}
            </span>
          </span>
        )}
        {!test.isPending && !result && !error && <span className="text-ink-muted">—</span>}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          className="btn btn-ghost text-xs"
          disabled={test.isPending}
          onClick={() => {
            setError(null);
            test.mutate(undefined, { onSuccess: setResult, onError: setError });
          }}
        >
          Test
        </button>
      </td>
    </tr>
  );
}
