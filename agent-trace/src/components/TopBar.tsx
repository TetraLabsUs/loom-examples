import { useQuery } from "@tanstack/react-query";
import { useClient } from "@tetralabs/loom-react";

export function TopBar({ appName }: { appName: string }) {
  const client = useClient();
  const health = useQuery({
    queryKey: ["example", "health"],
    queryFn: () => client.health.get(),
    retry: false,
    refetchInterval: 30_000,
  });
  const connected = health.isSuccess;

  return (
    <header className="flex h-14 items-center gap-3 border-b border-line bg-panel px-4">
      <img src="/logo.svg" alt="" width={24} height={24} />
      <span className="text-[20px] font-semibold">{appName}</span>
      <span className="ml-auto label">tenant: {__LOOM_HOST__ || "not configured"}</span>
      <span className="flex items-center gap-1.5 text-ink-muted">
        <span
          aria-hidden
          className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
        />
        {connected ? "connected" : health.isError ? "unreachable" : "connecting"}
      </span>
      {__LOOM_ADMIN_URL__ && (
        <a className="underline" href={__LOOM_ADMIN_URL__} target="_blank" rel="noreferrer">
          Admin
        </a>
      )}
    </header>
  );
}
