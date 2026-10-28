import { LoomApiError } from "@tetralabs/loom";

export function ErrorBanner({ error, onDismiss }: { error: Error | null; onDismiss?: () => void }) {
  if (!error) return null;
  const status = error instanceof LoomApiError ? `${error.status} ${error.statusText}` : null;
  return (
    <div role="alert" className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-red-900">
      {status && <span className="font-mono text-xs leading-5">{status}</span>}
      <span className="flex-1">{error.message}</span>
      {onDismiss && (
        <button type="button" className="underline" onClick={onDismiss}>
          dismiss
        </button>
      )}
    </div>
  );
}
