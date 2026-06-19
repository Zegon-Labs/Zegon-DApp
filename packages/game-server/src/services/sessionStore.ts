import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DuelSession } from "../types/duelSession.js";
import { sessionDir } from "../utils/paths.js";

const SESSION_DIR = sessionDir();

export async function saveSession(session: DuelSession): Promise<void> {
  await mkdir(SESSION_DIR, { recursive: true });
  await writeFile(
    join(SESSION_DIR, `${session.id}.json`),
    JSON.stringify(session, null, 2),
  );
}

export async function loadSession(
  duelId: string,
): Promise<DuelSession | null> {
  try {
    const data = await readFile(join(SESSION_DIR, `${duelId}.json`), "utf-8");
    return JSON.parse(data) as DuelSession;
  } catch {
    return null;
  }
}
