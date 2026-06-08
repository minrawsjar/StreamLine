# StreamLine backend (Rust)

A Cargo workspace of off-chain services for the StreamLine protocol.

| Crate | Role |
| --- | --- |
| `streamline-core` | Shared domain types, drip math, and a thin Sui JSON-RPC client (no heavy `sui-sdk` dep). |
| `streamline-indexer` | Ingests on-chain events into Postgres; serves a REST + WebSocket API the frontend reads. |
| `streamline-keeper` | Triggers gasless drips and auto-approves expired milestones (in progress). |

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

## Test

```bash
cargo test -p streamline-core        # drip-math unit tests
cargo check --workspace
```
