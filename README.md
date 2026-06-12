# StreamLine

**Programmable micropayments on Sui — gasless, milestone-gated, composable**

StreamLine turns paying someone into a continuous, milestone-gated financial flow. Instead of lump sums on arbitrary schedules, money drips in real time — split automatically across wallets, yield, and savings — with **zero transfer fees** for the end user.

> A client locks **$800** across 4 milestones. The freelancer watches money arrive in real time as they work. When a milestone is done they raise it on-chain; the client approves (or a keeper auto-approves after 48h). They can even **borrow against the live stream** before it's fully paid out — or flip on **Private amounts** so only the two of them ever see the numbers.

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

**Gasless drips** — Settlement in gasless increments (a configurable **1 USDC** floor keeps gas a negligible fraction of each drip) with no fee to either party. zkLogin users need no SUI for gas — transactions are sponsored.

**Milestone gates + auto-approve** — Money only flows after the client approves each milestone. If the client goes silent, a permissionless keeper auto-approves after a configurable window (default 48h). Neither side can be held hostage.

**Automatic splits** — Configure once: e.g. 70% spending wallet, 30% yield. Every drip routes accordingly, atomically, in one PTB.

**Borrow against a stream** — A live stream has a present value. Mint a non-transferable `CollateralReceipt` and borrow against future income without selling or waiting.

**Seedless onboarding** — Sign in with Google via **zkLogin/Enoki** → a real Sui address, no seed phrase, no wallet install.

**Live earn counter** — The recipient watches earnings tick every 100ms via client-side math; the indexer's WebSocket feed corrects the base on each confirmed drip.

**Confidential streaming** — Toggle *Private amounts* on any stream and the amounts never touch the chain in the clear. Balances and drip sizes become **Poseidon commitments**; every drip is justified by a **Groth16 zero-knowledge proof**; the freelancer decrypts their own figures locally via **Seal**. See [Privacy](#privacy).

---

## Privacy

Privacy in StreamLine isn't a separate mode bolted on the side — it's a per-stream toggle woven into the normal create/approve/drip flow. It attacks the four things a payment leaks, each with a primitive that is **live on Sui testnet** (no devnet-only crypto):

| Layer | What it hides | How | Status |
|-------|---------------|-----|--------|
| **Identity** | *who* is paying/getting paid | zkLogin / Enoki — Google sign-in maps to a fresh Sui address, no linkable wallet | ✅ shipped |
| **Gasless** | the gas-payer's footprint | Enoki sponsorship — the user never submits a gas coin | ✅ shipped |
| **Metadata** | milestone terms & deliverables | **Seal** threshold encryption (+ Walrus blob storage), gated by an on-chain `seal_approve` policy | ✅ shipped |
| **Amounts** | balances, rate, drip sizes | **Groth16 zk-SNARKs** (`sui::groth16`, BN254) over **Poseidon** commitments | ✅ shipped |

### What it aims to solve

A public stream is a glass wallet. Anyone reading the chain sees **how much** a freelancer earns, the client's **rate card**, the **size of the deal**, and **when** money moves — competitive and personal information that traditional invoicing keeps private. For real payroll and client work that transparency is a non-starter. StreamLine's goal: **the same trustless, milestone-gated, gasless stream — but the numbers are visible only to the two parties.**

### Why this was hard (and how we got around it)

The obvious tool for confidential balances on Sui is the `contra`/confidential-transfers design built on **Bulletproofs + ristretto255** — but those natives are **devnet-only**. We re-implement the same confidential-balance idea with a **Groth16 proof backend** instead, because `sui::groth16::verify_groth16_proof` (BN254) is enabled on **testnet and mainnet**. That single substitution is what makes end-to-end confidential amounts possible on a public network today.

### How confidential amounts work

1. **Commitments, not values.** A `ConfidentialStream<T>` keeps a *public* USDC reserve (the locked pool) but stores `remaining` and `earned` as **Poseidon commitments** — `commit(value, blinding)`. The chain sees a hash, never the amount.
2. **Every drip carries a proof.** `confidential_drip` accepts a **Groth16 transfer proof** showing the new commitments are a valid debit/credit of the old ones *and* that the moved amount sits in a **64-bit range** (`v ∈ [0, 2⁶⁴)`), so nobody can over-withdraw — all without revealing a single number. The Move verifier (`verify_wrap` / `verify_transfer` / `verify_unwrap`, embedded verifying keys) checks it natively.
3. **Wrap → stream → unwrap.** A `ConfidentialPool<T>` lets value enter (`wrap`), move between commitments (`confidential_transfer`), and exit (`unwrap`) — homomorphic add/sub on commitments, each gated by a range proof.
4. **The freelancer can read their own balance.** The per-stream blinding factors are sealed to the recipient with **Seal**; they decrypt locally in the browser, so their dashboard shows real dollars while the chain shows only commitments. Decryption never leaves the device.
5. **Milestone state stays public.** Which milestone is active, approvals, and auto-approve timing remain on-chain in the clear — only the *amounts* are hidden — so the trust/escrow guarantees are unchanged.

Proofs are generated in-browser with **circom 2.2.3 + snarkjs** (Poseidon via circomlibjs). The circuits — `wrap`, `transfer`, `unwrap` — are validated both in `sui move test` (Groth16 verifies on-chain) and against the Rust arkworks serializer to guarantee the JS-produced bytes are byte-identical to what the Move verifier expects.

### Honest limitations

- **Trusted setup.** Groth16 needs a per-circuit setup; for the hackathon it's a disclosed single-party ceremony.
- **Browser proving** is heavier than Bulletproofs (seconds, not milliseconds) but workable.
- **Cashing out reveals** the unwrapped amount unless it's spent confidentially onward.
- **Composability gap.** Scallop/NAVI can't read encrypted balances, so yield and stream-backed lending need a plaintext path — confidential streams trade those features for privacy.

---

## Why Sui

| Primitive | What it unlocks |
|-----------|-----------------|
| **Address Balances** | Protocol-level gasless stablecoin transfers — true per-interval streaming at any size. On EVM every drip costs gas. |
| **PTBs** | The split (pay + save + invest) executes atomically. If the yield leg fails, the whole drip reverts. |
| **Move object ownership** | Funds are physically locked inside a shared object, reachable only via entry functions. No reentrancy, no approval games. |
| **zkLogin** | Google OAuth → a Sui address directly. Onboarding with no seed phrase. |
| **`sui::groth16` native** | On-chain zk-SNARK verification (BN254), enabled on testnet/mainnet — the basis for **confidential amounts**. No devnet-only crypto required. |
| **Seal + Walrus** | Threshold-encrypted milestone terms with an on-chain access policy; ciphertext stored off-chain in Walrus. |

---

## Technical Architecture

### Core Technologies

| Technology | Purpose |
|------------|---------|
| **Sui Move 2024** | `Stream` / `StreamCap` / `CollateralReceipt` shared objects; the state machine. |
| **`ConfidentialStream` + `ConfidentialPool`** | Poseidon-committed balances; Groth16-verified confidential drips; Seal-sealed secrets. |
| **circom 2.2.3 + snarkjs** | `wrap` / `transfer` / `unwrap` zk circuits; in-browser proving (Poseidon via circomlibjs). |
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
│   │   ├── stream.move         #   Stream<T> + ConfidentialStream<T>, StreamCap, state machine,
│   │   │                       #     drip math, confidential_drip, seal_approve policy
│   │   ├── confidential_balance.move  # ConfidentialPool<T>, Groth16 verify_wrap/transfer/unwrap
│   │   └── collateral.move     #   CollateralReceipt, borrow-against-stream
│   └── tests/                  #   State machine, accrual, + confidential-stream/balance proofs
│
├── circuits/                   # zk-SNARK circuits (confidential amounts)
│   ├── src/                    #   wrap / transfer / unwrap (circom) + lib/commitment (Poseidon)
│   ├── prover/                 #   snarkjs proving + arkworks-compatible serializer
│   ├── converter/              #   Rust arkworks vk/proof → Sui byte format (parity check)
│   └── move/                   #   Groth16 on-chain verification tests
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
├── docs/                       # Vision + privacy build (Groth16 amounts, Seal metadata)
└── .gitignore
```

Each top-level package has its own README: **[contracts](contracts/README.md)** · **[backend](backend/README.md)** · **[frontend](frontend/README.md)** · **[mock-usdc](mock-usdc/README.md)**. Privacy build details live in [`docs/complete-privacy-build.md`](docs/complete-privacy-build.md), [`docs/confidential-streaming-plan.md`](docs/confidential-streaming-plan.md), and [`docs/privacy-seal-plan.md`](docs/privacy-seal-plan.md).

---

## Smart Contracts

Deployed on **Sui testnet**. Full details in [`contracts/README.md`](contracts/README.md).

| Package / Object | ID | Description |
|------------------|----|-------------|
| **streamline** (original) | [`0x9d6e78…b3a8`](https://suiscan.xyz/testnet/object/0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8) | Type-origin package — `stream` (+ `ConfidentialStream`), `confidential_balance`, `collateral` |
| **streamline** (latest upgrade) | [`0x98175e…dbdb`](https://suiscan.xyz/testnet/object/0x98175e041610f0f152a066233e7c477c63e8e484e80340561c63e1134134dbdb) | Current package the frontend calls (upgrade of the original) |
| **mock_usdc** (package) | [`0xf6ce32…2ed3`](https://suiscan.xyz/testnet/object/0xf6ce32fe48338464f3947b9d15cd4a0befa0fe9b3926fd9daf6cee3658482ed3) | Mintable test USDC (6 decimals) |
| **USDC TreasuryCap** (shared) | [`0xa7cb97…5330`](https://suiscan.xyz/testnet/object/0xa7cb971f4f93e5713c5703f63f3bc17fdf0f6bf1f9795dc010ac164827715330) | Permissionless faucet |

> Object **types** keep the original package id across upgrades, so the indexer filters events by `MoveEventModule` on `0x9d6e78…b3a8` to catch streams created against either id.

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
Stream is DRIPPING; enough time elapses to accrue the drip floor
  → keeper computes accrued = total * elapsed / duration
  → accrued ≥ 1 USDC (configurable floor) → drip<USDC>(stream, clock)
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
- **Confidential amounts** — balances/drips are Poseidon commitments; `confidential_drip` verifies a Groth16 transfer + 64-bit range proof on-chain, so a hidden amount can't exceed the committed balance. See [Privacy](#privacy).
- **Encrypted metadata** — milestone terms/deliverables are sealed with **Seal + Walrus**, released only to addresses that pass the on-chain `seal_approve` policy.

---

## Built With

| Partner / Framework | Integration |
|---------------------|-------------|
| **Sui** | Move 2024, shared objects, PTBs, Address Balances, on-chain Clock, `groth16` zk verifier |
| **Mysten dApp Kit** | Wallet connection + transaction building |
| **Enoki** | zkLogin (Google sign-in) + sponsored gasless transactions |
| **Seal + Walrus** | Threshold-encrypted milestone terms & deliverables, on-chain `seal_approve` policy |
| **circom + snarkjs** | zk-SNARK circuits (`wrap`/`transfer`/`unwrap`) + in-browser proving for confidential amounts |
| **Scallop / NAVI** | Yield routing + stream-backed lending (composability target; public streams only) |

---

## License

[MIT](LICENSE)

---

Built for **Sui Overflow 2026** — money that pays as you work. No fees, no seed phrase, no waiting.
