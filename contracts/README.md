# StreamLine — Move contracts

The on-chain core of StreamLine: programmable, milestone-gated, gasless payment
streams. A `Stream<T>` is a **shared object** holding a locked `Balance<T>`;
funds drip to the recipient (split across destinations) only while the stream is
`DRIPPING`, which the client unlocks per milestone. The Move type system enforces
the state machine — every transition asserts the current state, so an illegal
transition aborts the whole transaction.

- **Edition:** Sui Move `2024.beta`
- **Modules:** `streamline::stream`, `streamline::collateral`

## Deployments

| Network | Package ID | Published | Explorer |
| --- | --- | --- | --- |
| **testnet** | `0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8` | 2026-06-08 | [SuiScan ↗](https://suiscan.xyz/testnet/object/0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8) |
| mainnet | _not deployed_ | — | — |

### testnet deployment details

| Item | Value |
| --- | --- |
| Package ID | `0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8` |
| `UpgradeCap` (owned by deployer) | `0x351ff70fa0639fb0c1bf61bbb5402314c4b2d853f22e7274adbec4dba7f5447e` |
| Publish tx digest | [`EgeLX5dN3FEfzNgpPZsA92XJn7LHRwJSGpaMoW4HUbrY`](https://suiscan.xyz/testnet/tx/EgeLX5dN3FEfzNgpPZsA92XJn7LHRwJSGpaMoW4HUbrY) |
| Deployer address | `0x046d80ecab635be43d5e0b7b3ac896388e5e19f37829080ce2e06614e80ad5f0` |
| Modules | `stream`, `collateral` |

A machine-readable copy lives in [`deployment.testnet.json`](./deployment.testnet.json).
The package ID is baked into the frontend's testnet default
(`frontend/src/lib/networks.ts`) and read by the backend indexer from
`backend/.env` (`STREAMLINE_PACKAGE_ID`).

> The `UpgradeCap` controls future upgrades of this package — keep it safe.
> The package itself is immutable; upgrades publish a new version.

## State machine

```
LOCKED ──raise_completion──▶ PENDING_REVIEW ──approve/auto_approve──▶ DRIPPING
  ▲                                │                                     │
  └──────── milestone exhausted ───┴──────── raise_dispute ──▶ PAUSED    │
                                                                          ▼
                                              all milestones exhausted ─▶ DONE
```

| State | u8 | Meaning |
| --- | --- | --- |
| `LOCKED` | 0 | Funds locked; waiting for the freelancer to raise a milestone. |
| `PENDING_REVIEW` | 1 | Milestone raised; awaiting client approval (or auto-approve). |
| `DRIPPING` | 2 | Approved; `drip` may settle accrued funds. |
| `PAUSED` | 3 | Disputed; no drips until resolved. |
| `DONE` | 4 | All milestones exhausted (or cancelled). |

## `streamline::stream`

### Objects

- **`Stream<phantom T>`** — `key`, shared. Holds `balance: Balance<T>`, the
  milestone vector, split config, state, and drip watermarks.
- **`StreamCap`** — `key, store`, owned by the client. Authorizes
  `approve_milestone` and `cancel`; tied to exactly one stream by `stream_id`.
- **`Milestone`** — `{ name, amount }`. Amounts are base units and must each be
  ≥ `MIN_DRIP` and sum to the locked total.
- **`SplitLeg`** — `{ destination, weight_bps, yield_flag }`. Weights sum to 10000.

### Entry functions

| Function | Signer | Effect |
| --- | --- | --- |
| `create_stream<T>(payment, freelancer, milestone_names, milestone_amounts, duration_ms, dispute_window_ms, revocable, clock, ctx)` | Client | Locks `payment` into a shared `Stream`, transfers a `StreamCap` to the client. |
| `set_splits<T>(stream, destinations, weights_bps, yield_flags, ctx)` | Freelancer | Reconfigure drip routing (weights sum to 10000). |
| `raise_completion<T>(stream, clock, ctx)` | Freelancer | `LOCKED → PENDING_REVIEW`; sets the review deadline. |
| `approve_milestone<T>(cap, stream, clock)` | Client | `PENDING_REVIEW → DRIPPING`. |
| `auto_approve<T>(stream, clock)` | Anyone (keeper) | `PENDING_REVIEW → DRIPPING` once the deadline passes. |
| `drip<T>(stream, clock, ctx)` | Anyone (keeper) | Settles accrued funds (≥ `MIN_DRIP`) across splits, minus a 1 bps tip to the caller; relocks when the milestone is exhausted. |
| `raise_dispute<T>(stream, ctx)` | Client or freelancer | `PENDING_REVIEW`/`DRIPPING → PAUSED`. |
| `cancel<T>(cap, stream, ctx)` | Client | Reclaims the unstreamed balance; consumes the cap; `→ DONE`. |

### Accrual

Accrual is **proportional**, not a truncated per-ms rate (sub-unit rates round
to zero for normal stream sizes):

```
accrued = total * elapsed_ms / duration_ms          (u128 math)
drip_interval_ms = ceil(MIN_DRIP * duration_ms / total)
```

### Views

`state`, `is_dripping`, `remaining`, `current_milestone`, `drip_interval_ms`, `total`.

### Events

`StreamCreated`, `MilestoneRaised`, `MilestoneApproved`, `StreamDripped`,
`StreamPaused` — field names mirror the Rust indexer's parser.

### Constants

| Name | Value | Meaning |
| --- | --- | --- |
| `MIN_DRIP` | `10_000` | 0.01 USDC (6 decimals) — the gasless floor. |
| `BPS_DENOM` | `10_000` | Basis-point denominator for splits + tip. |
| `TIP_BPS` | `1` | Keeper tip = 1 bps of each settlement. |

### Errors

| Code | Name | When |
| --- | --- | --- |
| 0 | `EWrongState` | Operation called in the wrong state. |
| 1 | `ENotAuthorized` | Wrong signer or mismatched cap. |
| 2 | `EBadSplits` | Splits don't sum to 10000 / milestones don't sum to total. |
| 3 | `EMilestoneTooSmall` | A milestone is below `MIN_DRIP`. |
| 4 | `EBadDuration` | `duration_ms == 0`. |
| 5 | `ENoMilestones` | Empty / mismatched milestone vectors. |
| 6 | `ENotDue` | Drip below the floor, or auto-approve before the deadline. |

## `streamline::collateral`

A live stream has a calculable present value, so a freelancer can borrow against it.

- **`CollateralReceipt`** — `key` only (no `store`) → **non-transferable**. Records
  `{ stream_id, lender, principal, auto_repay }`.
- `present_value<T>(stream)` → `remaining * 90%`.
- `collateralize<T>(stream, lender, principal, auto_repay, ctx)` — requires the
  stream to be `DRIPPING` and `principal ≤ present_value`; mints the receipt and
  emits `Collateralized`.

## Build, test, publish

```bash
# build
sui move build

# unit tests (state machine + drip math)
sui move test

# publish (needs a funded address on the active env)
sui client publish --gas-budget 200000000
```

> The Sui / MoveStdlib framework deps are managed automatically by the CLI,
> pinned to the active environment's framework version (no `[dependencies]` in
> `Move.toml`).

### Gasless note

The deck's headline primitive — gasless `0x2::balance::send_funds` via Address
Balances — is a future API. This package models payouts with real `coin`
transfers (`coin::from_balance` + `public_transfer`) so it compiles and runs
today; comments in `drip` mark exactly where `send_funds` slots in once available.
