import { createLoomAdminClient } from "@tetralabs/loom/admin";

/**
 * The /admin entry point adds model, use-case and call-log operations. It does
 * not grant permissions: the key behind the dev proxy must be admin-capable.
 */
export const loom = createLoomAdminClient({
  // Absolute, not "/loom": asset URLs (page images) are resolved against it twice by the SDK.
  baseUrl: new URL("/loom", window.location.origin).href,
  getHeaders: async () => {
    // In production, return the signed-in user's token here, e.g.
    // return { Authorization: `Bearer ${session.access_token}` };
    return {};
  },
});
