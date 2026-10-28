import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export interface PresignEnv {
  S3_BUCKET?: string;
  S3_REGION?: string;
  /** Cloudflare R2 S3 API endpoint (account-level URL, no bucket path). */
  S3_ENDPOINT_URL?: string;
  S3_KEY_PREFIX?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}

/**
 * Dev-only `/api/presign` endpoint. The browser asks for a signed S3 PUT URL,
 * uploads the file directly to the bucket, then tells Loom to ingest the key
 * through the storage profile that points at the same bucket.
 */
export function presignPlugin(env: PresignEnv): Plugin {
  return {
    name: "loom-examples-presign",
    configureServer(server) {
      server.middlewares.use("/api/presign", (req, res) => {
        void handle(req, res, env);
      });
    },
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, env: PresignEnv) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  const missing = ["S3_BUCKET", "S3_REGION", "S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter(
    (k) => !env[k as keyof PresignEnv],
  );
  if (missing.length > 0) {
    return json(res, 500, { error: `Missing in .env: ${missing.join(", ")}` });
  }
  let body: { filename?: string; contentType?: string };
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }
  const filename = (body.filename ?? "").replace(/[^\w.-]+/g, "_").slice(0, 120);
  if (!filename) return json(res, 400, { error: "filename is required" });

  const prefix = (env.S3_KEY_PREFIX ?? "loom-examples").replace(/^\/+|\/+$/g, "");
  const key = `${prefix}/${crypto.randomUUID()}/${filename}`;

  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT_URL,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
    },
  });
  try {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        ContentType: body.contentType || "application/octet-stream",
      }),
      { expiresIn: 300 },
    );
    json(res, 200, { url, key });
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : "presign failed" });
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
