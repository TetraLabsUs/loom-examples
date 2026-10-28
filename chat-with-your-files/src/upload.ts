/** Asks the dev server for a presigned S3 PUT URL, then uploads with progress. */
export async function uploadToBucket(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<{ key: string }> {
  const presign = await fetch("/api/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type || "application/pdf" }),
  });
  if (!presign.ok) {
    const body = await presign.json().catch(() => null);
    throw new Error(body?.error ?? `presign failed: ${presign.status}`);
  }
  const { url, key } = (await presign.json()) as { url: string; key: string };

  // XMLHttpRequest because fetch has no upload progress events.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed: ${xhr.status}. Check the bucket's CORS rule allows PUT from this origin.`));
    xhr.onerror = () => reject(new Error("S3 upload failed (network or CORS)"));
    xhr.send(file);
  });
  return { key };
}
