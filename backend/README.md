# StreamLine backend (Rust)

A Cargo workspace of off-chain services for the StreamLine protocol.

| Crate | Role |
| --- | --- |
| `streamline-core` | Shared domain types, drip math, and a thin Sui JSON-RPC client (no heavy `sui-sdk` dep). |
| `streamline-indexer` | Ingests on-chain events into Postgres; serves a REST + WebSocket API the frontend reads. |
| `streamline-keeper` | Permissionless settlement worker: submits `drip` (or `drip_with_yield` when a vault is configured) once the gasless floor accrues, and `auto_approve`s milestones past their review window. |

## Prerequisites

- Rust (stable)
- PostgreSQL 14+

## Run the indexer

```bash
# 1. a database
createdb streamline                       # or point DATABASE_URL at any Postgres

# 2. configure
cp .env.example .env                       # edit DATABASE_URL / SUI_RPC_URL / package id

# 3. run (schema is applied automatically on startup)
DATABASE_URL=postgres://postgres@localhost:5432/streamline \
  cargo run -p streamline-indexer
```

### API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check. |
| GET | `/streams?freelancer=&sender=` | List streams, optionally filtered. |
| GET | `/stream/{id}` | One stream's cached state. |
| GET | `/stream/{id}/drips` | Drip history for a stream. |
| GET | `/ws` | WebSocket feed of live drip / state updates. |

The poller idles until `STREAMLINE_PACKAGE_ID` is set to a deployed package.

## Run the keeper

The keeper reads the same Postgres the indexer writes, finds streams that are
due, and submits settlement transactions by shelling out to the `sui` CLI. So it
needs the **Sui CLI configured** with a funded keystore on the keeper's network
(`sui client active-address` / `sui client switch --env testnet`). The keeper's
address pays gas and is reimbursed by the on-chain 1 bps tip — end users stay
fully gasless.

```bash
DATABASE_URL=postgres://postgres@localhost:5432/streamline \
STREAMLINE_PACKAGE_ID=0x<deployed-package> \
  cargo run -p streamline-keeper
```

| Env | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://localhost/streamline` | Shared with the indexer. |
| `STREAMLINE_PACKAGE_ID` | `0x0` | Deployed package; keeper idles until set. |
| `STREAMLINE_MODULE` | `stream` | Move module name. |
| `SUI_BIN` | `sui` | Path to the Sui CLI. |
| `SUI_CLOCK_ID` | `0x6` | Shared Clock object. |
| `KEEPER_GAS_BUDGET` | `100000000` | Gas budget per settlement tx (MIST). |
| `KEEPER_POLL_INTERVAL_MS` | `5000` | How often to scan for due streams. |
| `KEEPER_COOLDOWN_MS` | `120000` | Per-stream wait before re-acting (lets the indexer catch up). |
| `YIELD_VAULT_ID` | `0x0` | When set, drips use `drip_with_yield` so yield-flagged splits auto-deposit. |
| `KEEPER_DRY_RUN` | `false` | Log intended actions without submitting. |

Tip: start with `KEEPER_DRY_RUN=true` to watch which streams it would settle
before letting it spend gas.

> **Package id, two values.** The keeper *calls* functions, so its
> `STREAMLINE_PACKAGE_ID` must be the **latest** package (v8 — it has
> `drip_with_yield`). The **indexer** instead filters events by `MoveEventModule`
> on the **original** id, because object types keep their type-origin across
> upgrades. They're separate services, so set them independently.
>
> **Auto-yield.** Set `YIELD_VAULT_ID` (and a v8 `STREAMLINE_PACKAGE_ID`) and the
> keeper calls `drip_with_yield(stream, vault, clock)`: the yield-flagged split
> leg of every drip is deposited into the vault, minting the freelancer a
> `VaultReceipt` that compounds. Without it, the keeper uses plain `drip`.
>
> **Sui CLI version.** Testnet runs protocol 126; the bundled CLI must be
> **≥ testnet-v1.73.1** or every call panics. The Dockerfile pins this.
> Point the CLI's RPC (via `SUI_RPC_URL`) at a node that serves **gRPC** with no
> auth header — the official `https://fullnode.testnet.sui.io:443` works; keyed
> JSON-RPC-only endpoints (e.g. Ankr REST) do **not**.

## Test

```bash
cargo test -p streamline-core        # drip-math unit tests
cargo check --workspace
```
