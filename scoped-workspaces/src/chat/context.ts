import type { DocumentItem } from "../documents";

const MARKER = "\n\n---\nWorkspace context: ";

/**
 * Loom's agent only searches when it decides to, and it cannot see what the
 * retrieval scope contains. Telling it which documents are in the workspace
 * makes "summarize this document" work; `splitContext` hides the line in the UI.
 */
export function withWorkspaceContext(content: string, workspaceName: string, documents: DocumentItem[]): string {
  const names = documents.filter((d) => d.status === "ready").map((d) => d.name);
  if (names.length === 0) return content;
  return `${content}${MARKER}"${workspaceName}" contains ${names.length} document${names.length === 1 ? "" : "s"}: ${names.join(", ")}. Answer from these documents; use search_documents to read them.`;
}

export function splitContext(content: string): { text: string; context: string | null } {
  const i = content.indexOf(MARKER);
  if (i === -1) return { text: content, context: null };
  return { text: content.slice(0, i), context: content.slice(i + MARKER.length) };
}
