import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function blobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || null;
}

export function isBlobStorageConfigured(): boolean {
  return blobToken() !== null;
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(pathname, { token });
    const res = await fetch(meta.url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson(pathname: string, data: unknown): Promise<void> {
  const token = blobToken();
  if (!token) return;
  const { put } = await import("@vercel/blob");
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Load JSON from Vercel Blob (prod) or local file (dev fallback). */
export async function loadPersistedJson<T>(
  blobPath: string,
  localFile: string,
): Promise<T | null> {
  if (isBlobStorageConfigured()) {
    const fromBlob = await readBlobJson<T>(blobPath);
    if (fromBlob !== null) return fromBlob;
  }
  try {
    await mkdir(dirname(localFile), { recursive: true });
    const raw = await readFile(localFile, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Save JSON to Vercel Blob and mirror to local file when writable. */
export async function savePersistedJson(
  blobPath: string,
  localFile: string,
  data: unknown,
): Promise<void> {
  if (isBlobStorageConfigured()) {
    await writeBlobJson(blobPath, data);
  }
  try {
    await mkdir(dirname(localFile), { recursive: true });
    await writeFile(localFile, JSON.stringify(data, null, 2));
  } catch {
    /* ephemeral FS on serverless — blob is source of truth */
  }
}
