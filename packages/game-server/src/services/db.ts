import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyMessage, getAddress } from "ethers";

const NONCE_TTL_MS = 10 * 60 * 1000;
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let dbInitPromise: Promise<void> | null = null;

export async function ensureDbSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const schemaPath = join(import.meta.dirname, "../db/schema.sql");
    const schema = await readFile(schemaPath, "utf-8");
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await sql(statement);
    }
  })();

  return dbInitPromise;
}

export async function getSql(): Promise<
  ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) | null
> {
  if (!isDatabaseConfigured()) return null;
  await ensureDbSchema();
  const { neon } = await import("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

export function createNonce(address: string): string {
  const key = address.toLowerCase();
  const nonce = randomBytes(16).toString("hex");
  nonces.set(key, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function buildSiweMessage(address: string, nonce: string): string {
  const domain = process.env.SIWE_DOMAIN ?? "zegon.app";
  return `${domain} wants you to sign in with your Ethereum account:\n${getAddress(address)}\n\nSign in to ZEGON\n\nURI: https://${domain}\nVersion: 1\nChain ID: 16601\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

export function verifySiweSignature(
  address: string,
  message: string,
  signature: string,
): boolean {
  try {
    const recovered = verifyMessage(message, signature);
    if (getAddress(recovered) !== getAddress(address)) return false;
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/i);
    if (!nonceMatch) return false;
    const stored = nonces.get(address.toLowerCase());
    if (!stored || stored.expiresAt < Date.now()) return false;
    if (stored.nonce !== nonceMatch[1]) return false;
    nonces.delete(address.toLowerCase());
    return true;
  } catch {
    return false;
  }
}

export function requireSiweOrDev(
  address: string,
  auth?: { message?: string; signature?: string },
): { ok: true } | { ok: false; error: string } {
  if (process.env.REQUIRE_SIWE !== "true") return { ok: true };
  if (!auth?.message || !auth?.signature) {
    return { ok: false, error: "SIWE_REQUIRED" };
  }
  if (!verifySiweSignature(address, auth.message, auth.signature)) {
    return { ok: false, error: "SIWE_INVALID" };
  }
  return { ok: true };
}
