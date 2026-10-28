import { useLlmModels, useLlmUseCases, useSetLlmUseCaseDefault } from "@tetralabs/loom-react/admin";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";

/** Pick the default model per use case. No application code changes; the next call uses it. */
export function UseCases() {
  const useCases = useLlmUseCases();
  const models = useLlmModels();
  const setDefault = useSetLlmUseCaseDefault();

  if (useCases.isPending || models.isPending) return <p className="p-4 text-ink-muted">Loading…</p>;
  const error = useCases.error ?? models.error ?? setDefault.error;
  if (useCases.error || models.error) return <ErrorBanner error={error} />;
  if (useCases.data.length === 0) return <EmptyState message="This tenant reports no use cases." />;

  return (
    <div className="flex flex-col gap-3">
      <ErrorBanner error={setDefault.error} onDismiss={() => setDefault.reset()} />
      <table className="panel w-full text-left">
        <thead className="label">
          <tr className="border-b border-line">
            <th className="px-3 py-2 font-normal">Use case</th>
            <th className="px-3 py-2 font-normal">Kind</th>
            <th className="px-3 py-2 font-normal">Default model</th>
            <th className="px-3 py-2 font-normal">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {useCases.data.map((u) => {
            const candidates = models.data.filter((m) => m.kind === u.kind && m.enabled);
            const busy = setDefault.isPending && setDefault.variables?.useCase === u.useCase;
            return (
              <tr key={u.useCase}>
                <td className="px-3 py-2">{u.useCase}</td>
                <td className="px-3 py-2 text-ink-muted">{u.kind}</td>
                <td className="px-3 py-2">
                  <select
                    className="panel px-2 py-1"
                    disabled={busy || candidates.length === 0}
                    value={u.default?.modelId ?? ""}
                    onChange={(e) => setDefault.mutate({ useCase: u.useCase, modelId: e.target.value })}
                  >
                    {!u.default && <option value="">— not set —</option>}
                    {candidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider} · {m.model})
                      </option>
                    ))}
                  </select>
                  {candidates.length === 0 && (
                    <span className="ml-2 text-xs text-ink-muted">no enabled {u.kind} models</span>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-muted">
                  {u.default ? new Date(u.default.updatedAt).toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
