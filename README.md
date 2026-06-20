# ZEGON — Outdraw the Blind

**▶ Play:** [zegon-dapp.vercel.app](https://zegon-dapp.vercel.app) · **Landing:** [zegon-landing.vercel.app](https://zegon-landing.vercel.app) · [Zegon-Landing repo](https://github.com/Zegon-Labs/Zegon-Landing)

Turn-based duel vs ZEGON, a **blindfolded** AI gunslinger (sealed inference on 0G Compute). Each round leaves **commit-reveal on-chain** proof on Galileo before you choose your move.

## 0G Features

| Component | SDK / network | Role in ZEGON |
|-----------|---------------|---------------|
| **0G Compute** | `@0gfoundation/0g-compute-ts-sdk` | ZEGON prediction + TEE attestation |
| **0G Chain (Galileo)** | `ZegonDuel.sol`, chainId `16602` | `commitMove` → player input → `revealMove` → `recordDuel` |
| **0G Storage** | `@0glabs/0g-ts-sdk` | Duel log + attestations (blob) |

- Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)
- RPC: `https://evmrpc-testnet.0g.ai`
- Faucet: [faucet.0g.ai](https://faucet.0g.ai)

## Contract address (Galileo)

After deploy, set in `.env`:

```bash
ZEGON_DUEL_CONTRACT_ADDRESS=0x...
```

Deploy info is written to [`contracts/deployments/galileo.json`](contracts/deployments/galileo.json).

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env: SERVER_WALLET_PRIVATE_KEY, ZEGON_DUEL_CONTRACT_ADDRESS
```

### Build and test

```bash
pnpm test                  # game-core + game-server (commit hash)
pnpm test:contracts        # Hardhat — ZegonDuel.sol
pnpm compile
```

### Deploy contract (Galileo)

```bash
# Requires SERVER_WALLET_PRIVATE_KEY funded via faucet
pnpm deploy
```

### 0G smoke tests

```bash
pnpm smoke:galileo          # commit/reveal/record on Galileo
pnpm smoke:compute          # TEE inference hello-world
```

## Play locally

**Terminal 1 — API (sponsors gas, commit-reveal):**

```bash
pnpm dev:server
```

**Terminal 2 — Phaser client:**

```bash
# Offline mode (local DummyZegonBrain)
pnpm dev

# 0G mode (API + chain)
VITE_USE_OG_COMPUTE=true pnpm dev
```

With real 0G on the backend:

```bash
USE_OG_COMPUTE=true pnpm dev:server
```

The Vite proxy forwards `/api` → `localhost:3000`.

## Verifiable flow (per round)

1. Server infers ZEGON's move (history only) via 0G Compute.
2. `commitMove(hash)` on-chain **before** the player's input.
3. Client shows taunt + enables action buttons.
4. Player chooses action → `revealMove` on-chain.
5. At end: `recordDuel` + upload log to 0G Storage.
6. **VERIFY ON-CHAIN** button on results → `/api/duel/verify/:duelId`.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Description |
|----------|-------------|
| `SERVER_WALLET_PRIVATE_KEY` | Operator wallet (gas + broker) |
| `ZEGON_DUEL_CONTRACT_ADDRESS` | Deployed contract |
| `USE_OG_COMPUTE` | Backend: real TEE inference |
| `VITE_USE_OG_COMPUTE` | Client: use API instead of local brain |
| `OG_MODEL` | Compute model (default `glm-5-fp8`) |
| `OG_STORAGE_INDEXER` | Blob storage indexer |

## Monorepo

```
packages/game-core/     # Pure duel logic
packages/game-client/   # Phaser 3 + Vite
packages/game-server/   # Node API (0G Compute, chain, storage)
contracts/              # ZegonDuel.sol + Hardhat
```

## Zero Cup checklist

- [ ] Contract address + explorer link in README (post-deploy)
- [ ] Playable E2E demo with VERIFY
- [ ] Video: DEADEYE → VERIFY → explorer
- [x] Compute + Chain + Storage integration wired
- [x] Play without wallet (backend sponsors gas)

## Team

Zegon Labs — Zero Cup 2026
