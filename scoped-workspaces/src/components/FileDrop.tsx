import { useRef, useState } from "react";
import { uploadToBucket } from "../upload";

interface Upload {
  name: string;
  progress: number;
  phase: "uploading" | "ingesting";
}

export function FileDrop({
  onIngest,
  onError,
  accept = "application/pdf",
}: {
  onIngest: (name: string, key: string) => Promise<void>;
  onError: (error: Error) => void;
  accept?: string;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const update = (patch: Partial<Upload>) =>
        setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, ...patch } : x)));
      setUploads((u) => [...u, { name: file.name, progress: 0, phase: "uploading" }]);
      try {
        const { key } = await uploadToBucket(file, (p) => update({ progress: p }));
        update({ phase: "ingesting", progress: 1 });
        await onIngest(file.name, key);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setUploads((u) => u.filter((x) => x.name !== file.name));
      }
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        className={`panel w-full border-dashed p-4 text-center text-ink-muted ${over ? "border-ink" : ""}`}
      >
        Drop PDF here, or click to choose
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          void handle(e.target.files);
          e.target.value = "";
        }}
      />
      {uploads.map((u) => (
        <div key={u.name} className="mt-2 text-xs text-ink-muted">
          <div className="flex justify-between">
            <span className="truncate">{u.name}</span>
            <span>{u.phase === "uploading" ? `${Math.round(u.progress * 100)}%` : "ingesting"}</span>
          </div>
          <div className="mt-1 h-1 bg-line">
            <div className="h-1 bg-ink" style={{ width: `${u.progress * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
