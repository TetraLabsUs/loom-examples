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
