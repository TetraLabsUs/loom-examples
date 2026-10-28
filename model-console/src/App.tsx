import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { Calls } from "./pages/Calls";
import { Models } from "./pages/Models";
import { UseCases } from "./pages/UseCases";

const tabs = [
  { id: "models", label: "Models", view: <Models /> },
  { id: "use-cases", label: "Use cases", view: <UseCases /> },
  { id: "calls", label: "Calls", view: <Calls /> },
] as const;

export function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("models");

  return (
    <div className="flex h-screen flex-col">
      <TopBar appName="model-console" />
      <nav className="flex gap-1 border-b border-line bg-panel px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 ${tab === t.id ? "border-ink" : "border-transparent text-ink-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto p-4">{tabs.find((t) => t.id === tab)?.view}</main>
    </div>
  );
}
