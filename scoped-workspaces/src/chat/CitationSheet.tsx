import type { LoomChatCitation, LoomChatCitationChunk } from "@tetralabs/loom";
import { useOverview, usePageImage } from "@tetralabs/loom-react/documents";

export interface SelectedCitation {
  citation: LoomChatCitation;
  chunk: LoomChatCitationChunk;
  index: number;
}

/** Side sheet: the cited chunk's text and, when the server rendered one, the page image. */
export function CitationSheet({ selected, onClose }: { selected: SelectedCitation; onClose: () => void }) {
  const { citation, chunk, index } = selected;
  const overview = useOverview(citation.entityType, citation.entityId);
  const text = overview.data?.chunks.find((c) => c.id === chunk.chunkId)?.content;
  const page = overview.data?.pages.find((p) => p.page === chunk.page);
  const image = usePageImage(page?.imageUrl);

  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">
          [{index}] {citation.sourceRef}
          {chunk.page != null ? ` · page ${chunk.page}` : ""}
        </span>
        <button type="button" className="underline" onClick={onClose}>
          close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {overview.isPending && <p className="text-ink-muted">Loading…</p>}
        {text ? (
          <blockquote className="whitespace-pre-wrap border-l-2 border-ink pl-3 text-sm">{text}</blockquote>
        ) : (
          !overview.isPending && <p className="text-ink-muted">Chunk text not available.</p>
        )}
        {image && <img src={image} alt={`Page ${chunk.page}`} className="mt-4 w-full border border-line" />}
      </div>
    </aside>
  );
}
