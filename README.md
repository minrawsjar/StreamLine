# StreamLine

**Programmable micropayments on Sui — gasless, milestone-gated, composable**

StreamLine turns paying someone into a continuous, milestone-gated financial flow. Instead of lump sums on arbitrary schedules, money drips in real time — split automatically across wallets, yield, and savings — with **zero transfer fees** for the end user.

> A client locks **$800** across 4 milestones. The freelancer watches money arrive every **~52 seconds** as they work. When a milestone is done they raise it on-chain; the client approves (or a keeper auto-approves after 48h). They can even **borrow against the live stream** before it's fully paid out.

Built for **Sui Overflow 2026 · DeFi & Payments track**.

---

## The Problem

Every payment system shares the same shape: a lump sum, transferred at an arbitrary interval. Salaries are biweekly, freelancers invoice monthly, rent is due on the first. Work happens continuously; payment is discretized into chunks — because **transactions cost money, so you batch.**

- **Freelancer cash flow** — A developer in Lagos finishes work for a client in London. The wire takes 3–5 days. They've earned the money; they don't have it.
- **Trust in contracts** — Pay upfront (trust the freelancer) or pay on completion (trust the client). Every freelance platform is a middleman trying to patch this.
- **Silent clients** — Pay-on-completion lets a client stall indefinitely after the work is done.
- **Manual yield** — Moving income into savings/yield takes discipline most people never sustain.

### Scale

- **2.5B+** people underserved by traditional cross-border payroll
- **3–5 days** typical freelance settlement time
- **$0.00** — what a transfer should cost when money streams continuously

---

## The Solution

What if money could move *continuously*, for free, with the rules enforced on-chain?

StreamLine locks the full project amount up front in a **Move shared object**. Funds flow only while a milestone is approved, dripping to the recipient — and their split destinations — in gasless increments. No invoice, no chasing, no escrow middleman. The Move type system *is* the escrow.

### Capabilities

**Gasless drips** — Settlement in increments as small as **0.01 USDC** with no fee to either party. zkLogin users need no SUI for gas — transactions are sponsored.

**Milestone gates + auto-approve** — Money only flows after the client approves each milestone. If the client goes silent, a permissionless keeper auto-approves after a configurable window (default 48h). Neither side can be held hostage.

**Automatic splits** — Configure once: e.g. 70% spending wallet, 30% yield. Every drip routes accordingly, atomically, in one PTB.

**Borrow against a stream** — A live stream has a present value. Mint a non-transferable `CollateralReceipt` and borrow against future income without selling or waiting.

**Seedless onboarding** — Sign in with Google via **zkLogin/Enoki** → a real Sui address, no seed phrase, no wallet install.

**Live earn counter** — The recipient watches earnings tick every 100ms via client-side math; the indexer's WebSocket feed corrects the base on each confirmed drip.

---

## Why Sui

| Primitive | What it unlocks |
|-----------|-----------------|
| **Address Balances** | Protocol-level gasless stablecoin transfers — true per-interval streaming at any size. On EVM every drip costs gas. |
| **PTBs** | The split (pay + save + invest) executes atomically. If the yield leg fails, the whole drip reverts. |
| **Move object ownership** | Funds are physically locked inside a shared object, reachable only via entry functions. No reentrancy, no approval games. |
| **zkLogin** | Google OAuth → a Sui address directly. Onboarding with no seed phrase. |

---

## Technical Architecture

### Core Technologies

| Technology | Purpose |
|------------|---------|
| **Sui Move 2024** | `Stream` / `StreamCap` / `CollateralReceipt` shared objects; the state machine. |
| **PTBs + Address Balances** | Atomic multi-step settlement; gasless transfers. |
| **Rust + Tokio + Axum + sqlx** | Off-chain indexer (REST + WebSocket) and settlement keeper. |
| **PostgreSQL** | Cached stream state and drip history. |
| **Next.js 15 + React 19** | App Router frontend. |
| **@mysten/dapp-kit + Enoki** | Wallet connection, zkLogin, sponsored (gasless) transactions. |
| **three.js + Tailwind v4** | Bayer-dither hero and the live UI. |

### System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                            USER LAYER                               │
│   Google sign-in (zkLogin/Enoki) ──► Next.js app ──► sponsored tx   │
└────────────────────────────────┬──────────────────────────────────┘
                                 │ reads (cached)        │ writes (PTB)
                                 ▼                       ▼
┌──────────────────────────┐        ┌──────────────────────────────────┐
│   INDEXER (Rust · Axum)  │        │         SUI (testnet)             │
│   REST + WebSocket :PORT │◄──────►│                                   │
│   Postgres cache         │ events │   streamline::stream              │
└──────────────────────────┘        │     Stream<T> (shared object)     │
            ▲                        │     StreamCap (client cap)        │
            │ shares DB              │   streamline::collateral          │
            ▼                        │     CollateralReceipt             │
┌──────────────────────────┐        │   mock_usdc::mock_usdc (test)     │
│   KEEPER (Rust)          │───────►│                                   │
│   drip() once accrued    │  PTBs  │   0x2::clock, Coin<USDC>          │
│   auto_approve() at 48h  │        │                                   │
│   earns 1 bps tip        │        └──────────────────────────────────┘
└──────────────────────────┘
```

The **Move layer is the only source of truth.** The keeper and indexer are stateless services that read events and submit PTBs; the frontend reads from the indexer (fast) and writes via the user's wallet (direct to chain).

### State machine

```
LOCKED ──raise_completion──▶ PENDING_REVIEW ──approve / auto_approve──▶ DRIPPING
  ▲                                │                                       │
  └──────── milestone exhausted ───┴──────── raise_dispute ──▶ PAUSED      │
                                                                            ▼
                                                all milestones exhausted ─▶ DONE
```

---

## Project Structure

```
StreamLine/
│
├── contracts/                  # Move package `streamline` (Sui Move 2024)
│   ├── sources/
│   │   ├── stream.move         #   Stream<T>, StreamCap, the state machine + drip math
│   │   └── collateral.move     #   CollateralReceipt, borrow-against-stream
│   └── tests/stream_tests.move #   State machine + accrual unit tests
│
├── mock-usdc/                  # Mintable test USDC (testnet faucet)
│   └── sources/mock_usdc.move  #   6-decimal USDC clone, shared TreasuryCap
│
├── backend/                    # Rust workspace (off-chain services)
│   └── crates/
│       ├── core/               #   Shared types, drip math, thin Sui JSON-RPC client
│       ├── indexer/            #   Events → Postgres; REST + WebSocket API
│       └── keeper/             #   Permissionless drip() + auto_approve() worker
│
├── frontend/                   # Next.js 15 app (App Router, React 19)
│   └── src/
│       ├── app/                #   Routes + Enoki sponsorship API (/api/sponsor)
│       ├── components/         #   landing/, app/ dashboards, hero/ (dither), wallet/
│       └── lib/                #   networks, streamline-tx (PTBs), stream-math, indexer
│
├── docs/                       # Vision + privacy (Seal/Walrus) plan
└── .gitignore
```

Each top-level package has its own README: **[contracts](contracts/README.md)** · **[backend](backend/README.md)** · **[frontend](frontend/README.md)** · **[mock-usdc](mock-usdc/README.md)**.

---

## Smart Contracts

Deployed on **Sui testnet**. Full details in [`contracts/README.md`](contracts/README.md).

| Package / Object | ID | Description |
|------------------|----|-------------|
| **streamline** (package) | [`0x9d6e78…b3a8`](https://suiscan.xyz/testnet/object/0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8) | `stream` + `collateral` modules |
| **mock_usdc** (package) | [`0xf6ce32…2ed3`](https://suiscan.xyz/testnet/object/0xf6ce32fe48338464f3947b9d15cd4a0befa0fe9b3926fd9daf6cee3658482ed3) | Mintable test USDC (6 decimals) |
| **USDC TreasuryCap** (shared) | [`0xa7cb97…5330`](https://suiscan.xyz/testnet/object/0xa7cb971f4f93e5713c5703f63f3bc17fdf0f6bf1f9795dc010ac164827715330) | Permissionless faucet |

---

## Key Flows

### Create a stream

```
Client: "$800, 14 days, 4 milestones, 70% wallet / 30% yield"
  → mint/approve USDC (gasless faucet on testnet)
  → create_stream<USDC>(payment, freelancer, names, amounts, duration, window, revocable, clock)
  → full amount locked in a shared Stream<USDC>; client receives a StreamCap
  → StreamCreated event → indexer caches it
```

### Settlement (keeper drip)

```
Stream is DRIPPING; ~52s elapse
  → keeper computes accrued = total * elapsed / duration
  → accrued ≥ 0.01 USDC → drip<USDC>(stream, clock)
  → split across destinations, minus 1 bps keeper tip
  → StreamDripped event → frontend counter base updates
  → milestone exhausted → relock (LOCKED) or finish (DONE)
```

### Borrow against a stream

```
Stream is DRIPPING
  → present_value = remaining * 90%
  → collateralize<USDC>(stream, lender, principal ≤ PV, auto_repay)
  → mint non-transferable CollateralReceipt
  → Collateralized event
```

---

## Quick Start

### Prerequisites

- **Sui CLI** (configured with a funded testnet address)
- **Rust** (stable) + **PostgreSQL 14+** — for the indexer/keeper
- **Node.js 18+** — for the frontend

### 1. Contracts

```bash
cd contracts
sui move build
sui move test                                  # state machine + drip math
sui client publish --gas-budget 200000000      # publish to the active env
```

### 2. Backend (indexer + keeper)

```bash
cd backend
createdb streamline
cp .env.example .env          # set DATABASE_URL, SUI_RPC_URL, STREAMLINE_PACKAGE_ID

cargo run -p streamline-indexer       # REST + WebSocket, schema auto-applied
cargo run -p streamline-keeper        # permissionless settlement (start with KEEPER_DRY_RUN=true)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                            # http://localhost:3000
```

The testnet package ID and test-USDC type are baked into `frontend/src/lib/constants.ts` — the app works against the live testnet deployment out of the box.

---

## Security

- **Type-enforced escrow** — funds live inside a shared `Stream` object; no `require()` to bypass, no reentrancy.
- **Capability auth** — `approve_milestone` / `cancel` require the client's `StreamCap`, tied to one stream by ID.
- **State guards** — every entry function asserts its state; illegal transitions abort the whole transaction.
- **Non-custodial keeper** — the keeper only *triggers* permissionless functions; it never holds user funds. Its gas is reimbursed by the 1 bps tip, so users stay gasless.
- **Server-side secrets** — the Enoki sponsor key lives only in the Next.js route handler; the browser never sees it.
- **Roadmap: privacy** — encrypt milestone terms/deliverables with **Seal + Walrus** (see [`docs/privacy-seal-plan.md`](docs/privacy-seal-plan.md)).

---

## Built With

| Partner / Framework | Integration |
|---------------------|-------------|
| **Sui** | Move 2024, shared objects, PTBs, Address Balances, on-chain Clock |
| **Mysten dApp Kit** | Wallet connection + transaction building |
| **Enoki** | zkLogin (Google sign-in) + sponsored gasless transactions |
| **Seal + Walrus** | Encrypted milestone terms & deliverables (planned) |
| **Scallop / NAVI** | Yield routing + stream-backed lending (composability target) |

---

## License

[MIT](LICENSE)

---

Built for **Sui Overflow 2026** — money that pays as you work. No fees, no seed phrase, no waiting.
