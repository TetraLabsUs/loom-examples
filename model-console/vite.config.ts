import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Empty prefix: read LOOM_* too. Only VITE_* reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.LOOM_API_URL?.replace(/\/$/, "");
  const apiKey = env.LOOM_API_KEY;
  if (!apiUrl) console.warn("LOOM_API_URL is not set; copy .env.example to .env");

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __LOOM_HOST__: JSON.stringify(apiUrl ? new URL(apiUrl).host : ""),
      __LOOM_ADMIN_URL__: JSON.stringify(env.LOOM_ADMIN_URL || apiUrl || ""),
    },
    server: {
      proxy: {
        // The browser talks to /loom; the dev server adds the key and forwards.
        "/loom": {
          target: apiUrl ?? "http://localhost:0",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/loom/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
            });
          },
        },
      },
    },
  };
});
