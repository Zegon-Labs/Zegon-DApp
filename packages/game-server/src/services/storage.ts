import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = process.env.DUEL_LOG_DIR ?? join(process.cwd(), ".duel-logs");

export async function storeDuelLog(
  duelId: string,
  logs: unknown[],
): Promise<string | undefined> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const path = join(DATA_DIR, `${duelId}.json`);
    await writeFile(path, JSON.stringify(logs, null, 2));
    return path;
  } catch {
    return undefined;
  }
}

export async function loadDuelLog(duelId: string): Promise<unknown[] | null> {
  try {
    const path = join(DATA_DIR, `${duelId}.json`);
    const data = await readFile(path, "utf-8");
    return JSON.parse(data) as unknown[];
  } catch {
    return null;
  }
}
