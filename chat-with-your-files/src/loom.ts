import { createLoomClient } from "@tetralabs/loom";

/** The dev server proxies /loom to LOOM_API_URL and adds the API key, so the browser never sees it. */
export const loom = createLoomClient({
  // Absolute, not "/loom": asset URLs (page images) are resolved against it twice by the SDK.
  baseUrl: new URL("/loom", window.location.origin).href,
  getHeaders: async () => {
    // In production, return the signed-in user's token here, e.g.
    // return { Authorization: `Bearer ${session.access_token}` };
    return {};
  },
});

/** Every document this app ingests carries this group, and the chat is scoped to it. */
export const APP_GROUP = { groupType: "app", groupId: "chat-with-your-files" } as const;
export const DOCUMENT_ENTITY_TYPE = "file";
export const STORAGE_PROFILE = import.meta.env.VITE_STORAGE_PROFILE;
