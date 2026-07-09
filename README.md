# ZEGON — Outdraw the Blind

**▶ Play:** [zegonduel.com](https://www.zegonduel.com) · **Landing:** [zegon-landing.vercel.app](https://zegon-landing.vercel.app) · [Zegon-Landing repo](https://github.com/Zegon-Labs/Zegon-Landing)

Turn-based duel vs ZEGON, a **blindfolded** AI gunslinger. Each round is **commit-reveal on-chain** on 0G Galileo before you choose your move. Inference runs on **0G Compute** (TEE attestation); duel logs are archived on **0G Storage**.

---

## Highlights

| Feature | What it does |
|---------|----------------|
| **Tournament phases** | Global Ranking banner tracks three UTC phases (Jul 9–19): Quarter Finals → Semi Finals → Finals, with live countdown. |
| **Style PvP challenges** | Share a duel link; the defender faces the same seed while ZEGON mimics the challenger's rhythm from their stored log. Winner is **win/loss**, not score. |
| **Match stakes (optional)** | Symmetric OG testnet pool via `ZegonMatchPool` — both players deposit the same amount; operator settles to the winner after resolve. Free play always available. |
| **Duel audit** | Round-by-round log viewer from 0G Storage (direct indexer fetch + API fallback). Entry points: Profile, Leaderboard, `verify.html?root=`. |
| **Daily prize pool** | Optional stake on the daily seed; top ranks split the on-chain pool after reset. |
| **Gunslinger NFT** | Rank-based portrait NFT on Galileo (mint / burn / remint on rank-up). |

---

## 0G stack

| Component | SDK / network | Role in ZEGON |
|-----------|---------------|---------------|
| **0G Compute** | `@0gfoundation/0g-compute-ts-sdk` | ZEGON prediction + TEE attestation |
| **0G Chain (Galileo)** | Hardhat contracts, chainId `16602` | Commit-reveal duels, pools, leaderboard, NFT |
| **0G Storage** | `@0glabs/0g-ts-sdk` | Duel logs + audit index (blob-backed) |

- Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)
- RPC: `https://evmrpc-testnet.0g.ai`
- Storage indexer: `https://indexer-storage-turbo.0g.ai`
- Faucet: [faucet.0g.ai](https://faucet.0g.ai)

---

## Contracts (Galileo testnet)

Canonical addresses live in [`contracts/deployments/galileo.json`](contracts/deployments/galileo.json).

| Contract | Address | Purpose |
|----------|---------|---------|
| **ZegonDuel** | [`0x2Fc4…760b0`](https://chainscan-galileo.0g.ai/address/0x2Fc47e82c30B9d1B9193fa1978E96A92d7b760b0) | Per-round commit / reveal / record |
| **ZegonDailyPool** | [`0xF001…F44ea`](https://chainscan-galileo.0g.ai/address/0xF0011177988a323d2dFE4CFD29D2dFC2199F44ea) | Daily optional stakes |
| **ZegonMatchPool** | [`0xA108…Fb4d`](https://chainscan-galileo.0g.ai/address/0xA1085dfb4F440739B754DE6e911D0AedD56cFb4d) | PvP symmetric match stakes |
| **ZegonGunslinger** | [`0x23D6…BFdb4`](https://chainscan-galileo.0g.ai/address/0x23D671FaEd3adA290601990D45A959F1b60BFdb4) | Rank portrait NFT |

Copy into `.env` (see [`.env.example`](.env.example)):

```bash
ZEGON_DUEL_CONTRACT_ADDRESS=0x2Fc47e82c30B9d1B9193fa1978E96A92d7b760b0
ZEGON_DAILY_POOL_ADDRESS=0xF0011177988a323d2dFE4CFD29D2dFC2199F44ea
ZEGON_MATCH_POOL_ADDRESS=0xA1085dfb4F440739B754DE6e911D0AedD56cFb4d
ZEGON_GUNSLINGER_CONTRACT_ADDRESS=0x23D671FaEd3adA290601990D45A959F1b60BFdb4
```

---

## Game flow

### Solo duel (commit-reveal)

1. Server infers ZEGON's move from history only (0G Compute or dummy brain).
2. `commitMove(hash)` on-chain **before** the player acts.
3. Client shows taunt + action buttons.
4. Player chooses → `revealMove` on-chain.
5. End of duel: `recordDuel` + log upload to 0G Storage.
6. **VERIFY ON-CHAIN** on results → [`verify.html?duel=…`](https://www.zegonduel.com/verify.html)

### Style PvP challenge

1. Challenger finishes a verified duel and shares a short link (`?c=…`).
2. Defender accepts from the hub banner; server loads the challenger's style profile from storage.
3. Same seed + archetype; `ChallengerStyleBrain` biases ZEGON toward the challenger's patterns.
4. Resolve is **win-only**: defender wins if they won and the challenger lost; draw if both won or both lost.
5. Optional: both sides stake equal OG on `ZegonMatchPool` before the defender's duel; operator settles after resolve.

### Audit

- Indexed on every successful `storeDuelLog` (requires `SERVER_WALLET_PRIVATE_KEY`).
- UI: **Audit my last duel** (Profile) or pick a player on Global Ranking.
- Direct URL: `verify.html?root=<storageRoot>` or in-app Audit panel.

---

## Setup

```bash
pnpm install
cp .env.example .env
# Set SERVER_WALLET_PRIVATE_KEY (+ contract addresses if redeploying)
```

### Build & test

```bash
pnpm test                  # game-core + game-server
pnpm test:contracts        # Hardhat — all Solidity contracts
pnpm compile
pnpm build                 # full monorepo build
```

### Deploy contracts (Galileo)

Requires `SERVER_WALLET_PRIVATE_KEY` funded via [faucet.0g.ai](https://faucet.0g.ai).

```bash
pnpm deploy                # ZegonDuel
pnpm deploy:pool           # ZegonDailyPool
pnpm deploy:match-pool     # ZegonMatchPool
```

### Smoke tests

```bash
pnpm smoke:galileo          # commit / reveal / record on-chain
pnpm smoke:compute          # TEE inference hello-world
```

---

## Play locally

**Terminal 1 — API** (sponsors gas, storage, challenges):

```bash
pnpm dev:server
```

**Terminal 2 — client:**

```bash
pnpm dev                    # offline DummyZegonBrain
VITE_USE_OG_COMPUTE=true pnpm dev   # live API + chain
```

Full 0G backend:

```bash
USE_OG_COMPUTE=true pnpm dev:server
```

Vite proxies `/api` → `localhost:3000`.

---

## API (selected)

| Route | Description |
|-------|-------------|
| `POST /api/duel/start` | Start duel session |
| `POST /api/duel/round/commit` | ZEGON commit (TEE or style brain) |
| `POST /api/duel/record` | On-chain record + 0G Storage upload |
| `GET /api/duel/verify/:id` | Verify commits vs player timestamps |
| `GET /api/global/leaderboard` | Six boards + tournament phase countdown |
| `POST /api/challenge/create` | Short PvP link (score or style) |
| `POST /api/challenge/:id/accept` | Register defender + style profile |
| `POST /api/challenge/:id/resolve` | Win-only outcome + optional pool settle |
| `GET /api/audit/storage?root=` | Storage proxy fallback |
| `GET /api/player/:addr/last-duel-audit` | Latest indexed duel for audit UI |
| `GET /api/match/pool` | Match pool config (Galileo) |

---

## Environment variables

See [`.env.example`](.env.example) for the full list.

| Variable | Description |
|----------|-------------|
| `SERVER_WALLET_PRIVATE_KEY` | Operator wallet — gas, broker, storage uploads, pool settle |
| `ZEGON_DUEL_CONTRACT_ADDRESS` | Commit-reveal duel contract |
| `ZEGON_DAILY_POOL_ADDRESS` | Daily optional stakes |
| `ZEGON_MATCH_POOL_ADDRESS` | PvP match stakes |
| `ZEGON_GUNSLINGER_CONTRACT_ADDRESS` | Gunslinger NFT |
| `USE_OG_COMPUTE` | Backend: real TEE inference |
| `VITE_USE_OG_COMPUTE` | Client: API brain instead of local dummy |
| `OG_MODEL` | Compute model (default `glm-5-fp8`) |
| `OG_STORAGE_INDEXER` | Blob download base URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — profiles, leaderboard, audit index |

**Note:** All OG stakes are **Galileo testnet only** — no real monetary value. Free play is never gated by staking.

---

## Monorepo

```
packages/game-core/     # Duel logic, tournament phases, style resolution, audit parser
packages/game-client/   # Phaser 3 + Vite + React hub (leaderboard, audit, stakes UI)
packages/game-server/   # Node API — Compute, chain, storage, challenges, match pool
contracts/              # ZegonDuel, ZegonDailyPool, ZegonMatchPool, ZegonGunslinger
api/                    # Vercel serverless handler → game-server
```

Tournament phase dates are the single source of truth in `packages/game-core/src/constants/tournamentPhases.ts`.

---

## Zero Cup checklist

- [x] Contract addresses + explorer links in README
- [x] Playable E2E demo with VERIFY
- [x] Compute + Chain + Storage integration wired
- [x] Play without wallet (backend sponsors gas)
- [x] Public duel audit from 0G Storage
- [x] Async PvP style challenges + optional testnet stakes
- [ ] Video: DEADEYE → VERIFY → explorer

---

## Team

**Zegon Labs** — Zero Cup 2026 · [@Zegon_0g](https://x.com/Zegon_0g)
