# ZEGON — Outdraw the Blind

**▶ Jugar:** [zegon-dapp.vercel.app](https://zegon-dapp.vercel.app) · **Landing:** [zegon-landing.vercel.app](https://zegon-landing.vercel.app) · [Zegon-Landing repo](https://github.com/Zegon-Labs/Zegon-Landing)

Duelo por turnos vs ZEGON, un pistolero IA **vendado** (inferencia sellada en 0G Compute). Cada ronda deja prueba **commit-reveal on-chain** en Galileo antes de que elijas tu jugada.

## Features 0G

| Componente | SDK / red | Uso en ZEGON |
|------------|-----------|--------------|
| **0G Compute** | `@0glabs/0g-serving-broker` | Predicción de ZEGON + atestación TEE |
| **0G Chain (Galileo)** | `ZegonDuel.sol`, chainId `16602` | `commitMove` → input jugador → `revealMove` → `recordDuel` |
| **0G Storage** | `@0glabs/0g-ts-sdk` | Log del duelo + atestaciones (blob) |

- Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)
- RPC: `https://evmrpc-testnet.0g.ai`
- Faucet: [faucet.0g.ai](https://faucet.0g.ai)

## Contract address (Galileo)

Tras deploy, guardar en `.env`:

```bash
ZEGON_DUEL_CONTRACT_ADDRESS=0x...
```

La info del deploy se escribe en [`contracts/deployments/galileo.json`](contracts/deployments/galileo.json).

## Setup

```bash
pnpm install
cp .env.example .env
# Editar .env: SERVER_WALLET_PRIVATE_KEY, ZEGON_DUEL_CONTRACT_ADDRESS
```

### Compilar y testear

```bash
pnpm test                  # game-core + game-server (commit hash)
pnpm test:contracts        # Hardhat — ZegonDuel.sol
pnpm compile
```

### Deploy contrato (Galileo)

```bash
# Requiere SERVER_WALLET_PRIVATE_KEY con fondos del faucet
pnpm deploy
```

### Smoke tests 0G

```bash
pnpm smoke:galileo          # commit/reveal/record en Galileo
pnpm smoke:compute          # inferencia TEE hello-world
```

## Jugar localmente

**Terminal 1 — API (patrocina gas, commit-reveal):**

```bash
pnpm dev:server
```

**Terminal 2 — Cliente Phaser:**

```bash
# Modo offline (DummyZegonBrain local)
pnpm dev

# Modo 0G (API + chain)
VITE_USE_OG_COMPUTE=true pnpm dev
```

Con 0G real en backend:

```bash
USE_OG_COMPUTE=true pnpm dev:server
```

El proxy Vite envía `/api` → `localhost:3000`.

## Flujo verificable (por ronda)

1. Servidor infiere movimiento de ZEGON (solo historial) vía 0G Compute.
2. `commitMove(hash)` on-chain **antes** del input del jugador.
3. Cliente muestra taunt + habilita botones.
4. Jugador elige acción → `revealMove` on-chain.
5. Al final: `recordDuel` + upload log a 0G Storage.
6. Botón **VERIFY ON-CHAIN** en resultados → `/api/duel/verify/:duelId`.

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Descripción |
|----------|-------------|
| `SERVER_WALLET_PRIVATE_KEY` | Wallet operador (gas + broker) |
| `ZEGON_DUEL_CONTRACT_ADDRESS` | Contrato desplegado |
| `USE_OG_COMPUTE` | Backend: inferencia TEE real |
| `VITE_USE_OG_COMPUTE` | Cliente: usa API en lugar de brain local |
| `OG_MODEL` | Modelo Compute (default `glm-5-fp8`) |
| `OG_STORAGE_INDEXER` | Indexer blob storage |

## Monorepo

```
packages/game-core/     # Lógica pura del duelo
packages/game-client/   # Phaser 3 + Vite
packages/game-server/   # API Node (0G Compute, chain, storage)
contracts/              # ZegonDuel.sol + Hardhat
```

## Zero Cup checklist

- [ ] Contract address + link explorer en README (post-deploy)
- [ ] Demo jugable E2E con VERIFY
- [ ] Video: DEADEYE → VERIFY → explorer
- [x] Integración Compute + Chain + Storage cableada
- [x] Jugador sin wallet (backend patrocina gas)

## Equipo

Zegon Labs — Zero Cup 2026
