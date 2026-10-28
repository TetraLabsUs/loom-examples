import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClientProvider } from "@tetralabs/loom-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./tokens.css";
import { App } from "./App";
import { loom } from "./loom";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClientProvider client={loom}>
        <App />
      </ClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
