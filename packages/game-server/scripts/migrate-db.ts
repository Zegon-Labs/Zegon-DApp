import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { ensureDbSchema, isDatabaseConfigured } from "../src/services/db.js";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });
loadEnv({ path: resolve(import.meta.dirname, "../../../.env.local") });
loadEnv({ path: resolve(import.meta.dirname, "../../../.env.vercel") });

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL not set — skip migration or add it to .env");
    process.exit(1);
  }
  await ensureDbSchema();
  console.log("Database schema migrated (players.gunslinger, players.recent_duel_ids).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
