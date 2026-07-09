-- ZEGON engagement schema (Postgres / Neon)
-- Run once when DATABASE_URL is configured.

CREATE TABLE IF NOT EXISTS players (
  address TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  notches INTEGER NOT NULL DEFAULT 0,
  upgrades JSONB NOT NULL DEFAULT '{}',
  relics JSONB NOT NULL DEFAULT '{}',
  unlocks JSONB NOT NULL DEFAULT '[]',
  achievements JSONB NOT NULL DEFAULT '[]',
  daily_attempts JSONB NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  gunslinger JSONB,
  recent_duel_ids JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_players_nickname ON players (nickname);

-- Migrations for existing deployments (no-op on fresh installs)
ALTER TABLE players ADD COLUMN IF NOT EXISTS gunslinger JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS recent_duel_ids JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS global_scores (
  player_id TEXT PRIMARY KEY REFERENCES players(address) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  duel_id TEXT,
  nickname TEXT,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_scores_score ON global_scores (score DESC);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_at BIGINT NOT NULL,
  end_at BIGINT NOT NULL,
  prize_pool_wei TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'active',
  snapshot JSONB
);

CREATE TABLE IF NOT EXISTS auth_nonces (
  address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
