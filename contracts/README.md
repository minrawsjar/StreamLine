# StreamLine — Move contracts

The on-chain core of StreamLine: programmable, milestone-gated, gasless payment
streams. A `Stream<T>` is a **shared object** holding a locked `Balance<T>`;
funds drip to the recipient (split across destinations) only while the stream is
`DRIPPING`, which the client unlocks per milestone. The Move type system enforces
the state machine — every transition asserts the current state, so an illegal
transition aborts the whole transaction.

- **Edition:** Sui Move `2024.beta`
- **Modules:** `streamline::stream` (public + confidential streams, dispute resolution, auto-yield), `streamline::confidential_balance` (Groth16-verified pools), `streamline::yield_vault` (Scallop-shaped vault), `streamline::collateral` (present value + lending pool)

## Deployments

The package has been upgraded through **v8** (one `UpgradeCap`, original id is the
type-origin). Object types stay pinned to the version that introduced them.

| Item | Value |
| --- | --- |
| **Original (type-origin)** | `0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8` |
| **Latest (v8) — call this** | `0x28506598eccbbde36bbfef6401936c1d907c21a7e8db77c56390b6b291fad0a2` |
| `UpgradeCap` | `0x351ff70fa0639fb0c1bf61bbb5402314c4b2d853f22e7274adbec4dba7f5447e` |
| Deployer / keeper address | `0x046d80ecab635be43d5e0b7b3ac896388e5e19f37829080ce2e06614e80ad5f0` |
| YieldVault (shared, 8% APR) | `0x8ae9d8805682aabbd00ff0582d93b88f2f86482bcabed194a88a6ded99a88406` |
| LendingPool (shared, 12% APR) | `0x0518d5d77a3069ebab9df5b46e60fed4589c16dc6e48cd694a02c9350f312ea2` |
| mainnet | _not deployed_ |

### Version history

| v | Package id (tail) | Adds |
| --- | --- | --- |
| v1 | `…b3a8` | `stream`, `collateral` (present value + `CollateralReceipt`) |
| v2 | — | `confidential_balance`, `ConfidentialStream` |
| v3 | — | Seal secrets + confidential milestone review |
| v5 | `…27a9` | Mutual dispute resolution (`propose_resolution` / `accept_resolution`) |
| v6 | `…d906217` | `yield_vault` (`VaultReceipt` type-origin) |
| v7 | `…ccb528c` | Lending pool (`LendingPool`, `LoanReceipt` type-origin) |
| v8 | `…91fad0a2` | Auto-yield (`create_stream_v2`, `drip_with_yield`) |

> **Who calls which id:** the **frontend** and **keeper** call the *latest* (v8);
> the **indexer** filters events by `MoveEventModule` on the *original* id; the app
> queries `VaultReceipt`/`LoanReceipt` by their *defining* packages (v6 / v7).
> The `UpgradeCap` controls upgrades — published versions are immutable.

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
| `create_stream<T>(payment, freelancer, names, amounts, duration_ms, window, revocable, clock, ctx)` | Client | Locks `payment` into a shared `Stream` (100%-cash split), transfers a `StreamCap` to the client. |
| `create_stream_v2<T>(…, yield_bps, clock, ctx)` | Client | Same, but bakes in an auto-yield split: `yield_bps` routes through the vault on drip, the rest is cash. |
| `set_splits<T>(stream, destinations, weights_bps, yield_flags, ctx)` | Freelancer | Reconfigure drip routing (weights sum to 10000). |
| `raise_completion<T>(stream, clock, ctx)` | Freelancer | `LOCKED → PENDING_REVIEW`; sets the review deadline. |
| `approve_milestone<T>(cap, stream, clock)` | Client | `PENDING_REVIEW → DRIPPING`. |
| `auto_approve<T>(stream, clock)` | Anyone (keeper) | `PENDING_REVIEW → DRIPPING` once the deadline passes. |
| `drip<T>(stream, clock, ctx)` | Anyone (keeper) | Settles accrued funds (≥ `MIN_DRIP`) across splits, minus a 1 bps tip; relocks when the milestone is exhausted. |
| `drip_with_yield<T>(stream, vault, clock, ctx)` | Anyone (keeper) | Like `drip`, but yield-flagged legs deposit into `vault` and send the freelancer a `VaultReceipt`. |
| `raise_dispute<T>(stream, ctx)` | Client or freelancer | `PENDING_REVIEW`/`DRIPPING → PAUSED`. |
| `propose_resolution<T>(stream, resume, freelancer_bps, ctx)` | Client or freelancer | Propose how to end a `PAUSED` dispute (stored in a dynamic field). |
| `accept_resolution<T>(stream, clock, ctx)` | The *other* party | Execute the agreed resolution: `resume → DRIPPING`, or split the remainder + `→ DONE`. |
| `cancel<T>(cap, stream, ctx)` | Client | Reclaims the unstreamed balance (revocable streams); consumes the cap; `→ DONE`. |

### Accrual

Accrual is **proportional**, not a truncated per-ms rate (sub-unit rates round
to zero for normal stream sizes):

```
accrued = total * elapsed_ms / duration_ms          (u128 math)
drip_interval_ms = ceil(MIN_DRIP * duration_ms / total)
```

### Views

`state`, `is_dripping`, `remaining`, `current_milestone`, `drip_interval_ms`, `total`, `has_proposal`.

### Dispute resolution (mutual)

A `PAUSED` stream exits only by mutual agreement. `propose_resolution` writes a
`ResolutionProposal { proposer, resume, freelancer_bps }` into a **dynamic field**
(so no struct-layout change — upgrade-safe); `accept_resolution` asserts the
caller is the party that *didn't* propose, then either resumes (`→ DRIPPING`,
watermark reset so the paused gap isn't paid) or splits the remaining balance
(`freelancer_bps` to the freelancer, the rest refunded) and closes (`→ DONE`).

### Auto-yield

`create_stream_v2` builds a two-leg split `[freelancer cash (10000−yield_bps),
freelancer yield (yield_bps, yield_flag)]`. On `drip_with_yield`, the yield-flagged
leg is deposited into the `YieldVault<T>` and the resulting `VaultReceipt` is sent
to the freelancer instead of cash — so the configured % compounds from the second
it's earned.

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

## Confidential streaming (`ConfidentialStream` + `streamline::confidential_balance`)

The same milestone-gated stream, but with **amounts hidden on-chain**. Used when
the *Private amounts* toggle is on. Only the dollar figures are confidential —
milestone state, approvals, and auto-approve timing stay public, so the escrow
guarantees are identical to a normal stream.

### `ConfidentialStream<phantom T>` (in `stream`)

- `key`, shared. Holds a **public** `reserve: Balance<T>` (the locked pool) plus
  `remaining` and `earned` as **Poseidon commitments** (`commit(value, blinding)`),
  the current milestone, and **Seal-encrypted secrets** (blinding factors sealed
  to the recipient).
- `create_confidential_stream` / `_v2` — lock the reserve and publish the initial
  commitments.
- `confidential_drip` / `_v2` — advance the stream by verifying a **Groth16 transfer
  proof**: the new `remaining`/`earned` commitments are a valid debit/credit of the
  old ones and the moved amount lies in `[0, 2⁶⁴)`. No amount is revealed.
- `claim` — recipient withdraws settled value from the public reserve.
- `conf_raise_completion` / `conf_approve_milestone` / `conf_auto_approve` — the
  confidential mirror of the public milestone flow.
- `seal_approve(id, ctx)` — the **Seal access policy** (entry): gates decryption of
  the sealed secrets to authorized addresses. Mirrored by `seal_approve_for_testing`.

### `streamline::confidential_balance`

- **`ConfidentialPool<T>`** — a pooled public reserve plus registered commitments;
  value enters with `wrap`, moves with `confidential_transfer`, and exits with `unwrap`
  (homomorphic add/sub on commitments).
- `verify_wrap` / `verify_transfer` / `verify_unwrap` — `public(package)` Groth16
  verifiers with **embedded verifying keys** (one per circuit). Each checks a range
  proof so a hidden value can never exceed the committed balance.

Proofs are produced in-browser (`circuits/`, circom + snarkjs) and the Move
verifiers run natively via `sui::groth16` (BN254) — enabled on testnet/mainnet.
The confidential paths are covered by `tests/confidential_stream_tests.move` and
`tests/confidential_balance_tests.move`.

## `streamline::yield_vault` (Scallop-shaped vault)

Testnet stand-in for Scallop's lending pool — same `deposit`/`redeem` shape, so a
mainnet build swaps these calls 1:1 for `scallop_protocol::mint`/`redeem`.

- **`YieldVault<T>`** — shared; holds a `reserve: Balance<T>`, `total_shares`, a
  compounding `index` (1e12-scaled), and `apr_bps`.
- **`VaultReceipt<T>`** — `key, store`; a deposit's `shares` (Scallop's `Coin<MarketCoin<T>>` analog).
- `create_vault<T>(apr_bps, clock, ctx)` · `fund<T>(vault, coin)` (seed the interest buffer).
- `deposit<T>(vault, coin, clock, ctx) → VaultReceipt<T>` — accrue, mint shares at the current index.
- `redeem<T>(vault, receipt, clock, ctx) → Coin<T>` — principal + accrued interest.
- `value_of` / `receipt_value` views project the index to *now* for live valuation.

## `streamline::collateral`

A live stream has a calculable present value, so a freelancer can borrow against it.

**Position record (v1):**
- **`CollateralReceipt`** — `key` only → **non-transferable**. Records `{ stream_id, lender, principal, auto_repay }`.
- `present_value<T>(stream)` → `remaining * 90%`.
- `collateralize<T>(stream, lender, principal, auto_repay, ctx)` — records a position (`DRIPPING`, `principal ≤ PV`).

**Lending pool (v7) — concrete borrow/repay:**
- **`LendingPool<T>`** — shared; `reserve`, `total_borrowed`, `borrow_apr_bps`. `create_pool` / `fund_pool` (lenders seed liquidity).
- **`LoanReceipt<T>`** — `key, store`; `{ pool_id, borrower, stream_id, principal, opened_ms, borrow_apr_bps }`.
- `borrow<T>(pool, stream, principal, clock, ctx) → Coin<T>` — `principal ≤ present_value` and `≤ reserve`; mints a `LoanReceipt`, pays cash now.
- `owed<T>(loan, now)` → principal + borrow-APR interest.
- `repay<T>(pool, loan, payment, clock, ctx) → Coin<T>` — pay `owed` in full, change returned. Lender yield = borrower interest.

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
