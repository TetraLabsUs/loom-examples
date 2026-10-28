import { createLoomClient } from "@tetralabs/loom";

/** The dev server proxies /loom to LOOM_API_URL and adds the API key. */
export const loom = createLoomClient({
  // Absolute, not "/loom": asset URLs (page images) are resolved against it twice by the SDK.
  baseUrl: new URL("/loom", window.location.origin).href,
  getHeaders: async () => {
    // In production, return the signed-in user's token here, e.g.
    // return { Authorization: `Bearer ${session.access_token}` };
    return {};
  },
});

/**
 * In Loom one entity is one document (re-ingesting an entity creates a new
 * generation of it), so each file gets its own entity and the workspace key
 * goes on the group. Loom stores nothing else about the workspace; the system
 * of record stays in your app.
 */
export const DOCUMENT_ENTITY_TYPE = "document";
export const WORKSPACE_GROUP_TYPE = "workspace";
export const STORAGE_PROFILE = import.meta.env.VITE_STORAGE_PROFILE;

/** The key that ties a document, a search and a chat to one workspace. */
export function workspaceScope(workspaceId: string) {
  return { groupType: WORKSPACE_GROUP_TYPE, groupId: workspaceId } as const;
}
