import { useOverview } from "@tetralabs/loom-react/documents";
import type { DocumentItem } from "../documents";
import { StatusPill } from "./StatusPill";

export function DocumentList({ documents }: { documents: DocumentItem[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="panel divide-y divide-line">
      {documents.map((doc) => (
        <li key={doc.entityId} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate" title={doc.name}>
            {doc.name}
          </span>
          {doc.status === "ready" ? <StatusPill status="ready" /> : <LivePill doc={doc} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * While a document is in flight the extraction job carries any error from the
 * last attempt, so a bad file shows "failed" with the server's message even
 * while the server is still retrying it.
 */
function LivePill({ doc }: { doc: DocumentItem }) {
  const overview = useOverview(doc.entityType, doc.entityId);
  const job = overview.data?.extractionJobs[0];
  const message = job?.error ?? null;
  const status = message ? "failed" : doc.status;
  return (
    <span className="flex flex-col items-end gap-0.5">
      <StatusPill status={status} message={message} />
      {message && (
        <span className="max-w-[200px] truncate text-xs text-red-800" title={message}>
          {job?.attempts ? `attempt ${job.attempts} · ` : ""}
          {message}
        </span>
      )}
    </span>
  );
}
