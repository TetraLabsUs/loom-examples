export type DocumentStatus = "queued" | "processing" | "ready" | "failed";

const styles: Record<DocumentStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  processing: "bg-sky-100 text-sky-800",
  ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusPill({ status, message }: { status: DocumentStatus; message?: string | null }) {
  return (
    <span
      title={status === "failed" ? (message ?? "Ingestion failed") : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${styles[status]}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
