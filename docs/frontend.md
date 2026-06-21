# StreamLine Frontend — Product & UI Synthesis

This document describes **what the StreamLine frontend communicates** to users: messaging, flows, visual language, and how landing previews relate to the live apps. It reflects the current Next.js app under `frontend/`.

---

## What StreamLine is (as told by the UI)

StreamLine is **programmable micropayments on Sui**: USDC streams that pay as work happens, gaslessly, with optional yield splits, private amounts, and borrowing against future drip income.

The frontend presents three layers:

| Layer | Where | Purpose |
|-------|--------|---------|
| **Landing** | `/` | Scroll-driven story + phone mockups; converts to app via **Start App** |
| **StreamLine (user)** | `/app/user` + phone shell `user` | Freelancers and clients: earn, create, request, borrow, yield |
| **StreamLine.pro** | `/app/pro` + phone shell `pro` | Business payroll demo: self-organized stream groups (**Demo** badge) |

Wallet connection (Sui wallet or zkLogin via Enoki) gates all live app surfaces. Testnet USDC faucet is available in the user app header.

---

## Routes & entry

```
/                 → ScrollHero landing (full viewport, no traditional marketing sections)
/app              → redirects to /
/app/user         → UserAppShell (desktop)
/app/pro          → ProDashboard (desktop)
```

**Start App** (hero nav) opens an in-phone **app launcher** inside the landing mockup — not a separate URL. From there users pick **StreamLine** or **StreamLine Pro** without leaving the landing page.

Desktop users can go directly to `/app/user` or `/app/pro` via the workspace launcher (`AppLauncher`) when linked from elsewhere.

---

## Landing page — scroll hero

The landing is a **fixed full-screen scroll experience** (`ScrollHero`). Wheel, touch swipe, or arrow keys advance **6 scenes** defined in `heroScenes.ts`. Each scene has:

- Left / right **text panels** (`SceneTextPanel`) — headline, accent phrase, body copy
- Center **phone mockup** (`PhoneMockup`) — animated preview for that narrative
- Theme: **light** (white) or **pro** (dark `#0a0a0a`)

### Scene narrative map

| Scene ID | Phone preview | Theme | Left message | Right message |
|----------|---------------|-------|--------------|---------------|
| `hero` | Dashboard cards | light | Moving money at **the speed of work** — programmable micropayments | Continuously, **securely & privately** — gasless, yield-bearing, liquid |
| `how` | Milestone timeline | light | Get paid as you work **in real time** — no invoices, wires, or waiting | Smart contracts **replace the handshake** — flows when milestones approved |
| `finance` | Yield / borrow split viz | light | Earn yield **with your stream** — split into yield & savings, compound from second one | Borrow against **your stream** — lump sum now, drips repay automatically |
| `privacy` | Tap-to-reveal cards | light | Your money is **nobody's business** — private streams, no config | Audit trail & **selective disclosure** — proofs for accountant, bank, tax |
| `pro` | Pay run dashboard | pro | Payroll that **runs itself** — bulk pay runs, roles, batch milestones | Zero borders, **zero banks** — global USDC; capital **works harder** (yield on payroll) |
| `launch` | “Money Streams Coming Soon” | light | App Store badge (Apple) | **Start App →** CTA |

Copy on the finance and privacy scenes uses enlarged headlines (`headlineLarge`) where noted in config.

### Phone mockup previews (non-functional)

These are **marketing animations**, not wired to chain state:

- **Dashboard** — stacked balance cards, live earn counter, quick actions, activity feed
- **States** — embedded `HowStepsTimeline` (milestone lifecycle)
- **Finance** — `FinancePhonePreview`: stream card drips down; splits to Spendable / Yield / Borrow buckets; 2s drip cycle
- **Privacy** — `PrivacyPhonePreview`: two equal cards (stream + wallet), masked `***` / `$***`, tap to reveal; centered layout; drip dot between cards
- **Pro** — `ProPhonePreview`: pay run total ticks up with green yield line; Engineering / Design drip down; Operations expanded with 3 member substreams
- **Launch** — shiny “Coming Soon” title

Nav: **Start App** opens launcher; **Back to main** returns to scroll story.

---

## StreamLine user app

### Roles

On first connect, **RoleSelect** asks: **Client (payer)** or **Freelancer (receiver)**. Tabs differ by role.

| Role | Tabs | Core panels |
|------|------|-------------|
| Payer | Dashboard, Create stream, Yield | `ClientDashboard`, `StreamCreator`, `YieldPanel` |
| Receiver | Dashboard, Yield, Collateral | `FreelancerDashboard`, `YieldPanel`, `CollateralPanel` |

Private streams appear inside dashboards (🔒), not as a separate tab. Create flow supports **Private amounts** (Groth16 + Seal) and **auto-yield** via `create_stream_v2`.

### Phone user app (`PhoneUserShell`)

Mobile-first shell inside the landing phone and `PhoneAppShell`:

**Home (`PhoneHomeView`)**

- **Card stack** — Total balance (wallet + live accrual) + one card per active stream
- Live dripping streams: amount ticks up in green; **no “Dripping” label** on the card face (motion implies it)
- Streams with an active loan show **Repaying loan** + borrowed/owed meta
- **Quick actions**: Request, Create, Transfer
- **Activity**: drips, stream events, borrow events
- Tap card → stream details; macro card → active streams list

**Stream details (`PhoneStreamDetailsView`)**

- Earned so far (live counter for dripping streams)
- Milestone, interval, locked, remaining, drip/min, role
- Progress donut
- **Borrow against** — two-line orange button (`Borrow` / `against`)
- When a loan exists:
  - Button becomes **Borrow details**
  - **Net to wallet** replaces gross earned as headline
  - Green/red split bar under earned: stream portion to wallet vs repaying loan
  - Rates: `−X/sec repaying · +Y/sec to wallet`
  - Active loan banner (borrowed / owe)

**Borrow flow (`PhoneBorrowAgainstView`)**

- Borrow up to **90% PV** of remaining stream (`PV_DISCOUNT`)
- Slider + gasless `collateral::borrow` PTB
- After borrow: success copy says drips repay automatically; pending borrow cached in session until `LoanReceipt` indexes
- With existing loan: **Borrow details** screen — owed, repay split viz, optional **Borrow more**

**Other modals**

- Create stream, Request stream (QR link), Transfer, Scan → Fulfill request

### Desktop collateral (`CollateralPanel`)

Same lending story as phone: list dripping streams, borrow amount, active loans with manual **repay** button. Mirrors pool state via `useLending`.

### Borrow UI vs on-chain today

The UI **models auto-repay from drips** (split bars, net earned, copy). On-chain, `collateral::repay` is a **manual** full repayment today; drip routing to the pool is the intended product story and finance-scene animation, not yet enforced by the keeper. `loan-ui.ts` computes display splits for UX consistency.

---

## StreamLine.pro app

Marked **Demo** everywhere (green badge next to `.pro` title). Fund / Withdraw / Analytics buttons show demo-only messages when clicked.

### Desktop (`/app/pro`)

- Header: StreamLine**.pro** + Demo + Fund / Withdraw / Analytics + scan + wallet
- **Payroll run** total in white; green **yield accruing** when groups have committed budget
- **Stream groups** — user-created, persisted per wallet in `localStorage` (`pro-groups-store`)
- **+ Add stream group** dashed card → name + optional description
- Each group expands: substreams (name, budget, drip/sec, status: dripping / paused / pending)
- Balances tick down live for dripping substreams; totals include simulated yield on committed capital

No mock departments or “next disbursement” — structure is entirely user-defined.

### Landing pro preview

Separate animated mock (`ProPhonePreview`) for the scroll scene; similar visual language but fixed demo data.

---

## Visual & interaction language

| Element | User app | Pro / demo |
|---------|----------|------------|
| Background | `#f1efe9` cream | `#0a0a0a` dark |
| Primary accent | `#5b54e6` purple | white / `#1d9e75` yield green |
| Live money | `#1d9e75` green, tabular nums | white totals, green yield line |
| Borrow / loan | `#e85d2a` orange-red | — |
| Cards | White glass, rounded-2xl | `border-white/10`, `bg-white/[0.04]` |
| Typography | Poppins (app chrome), Inter (pro) | |

**Glass buttons**: `sl-glass-btn` (light), `sl-glass-btn-dark` (pro). Primary CTA on landing: **Start App** (semibold).

---

## Data & state

| Concern | Source |
|---------|--------|
| Public streams | Rust indexer REST + WS (`indexer.ts`), `useStreams` |
| Live drip accrual | `stream-state.ts` — mirrors Move timing client-side |
| Vault / yield | `use-yield.ts` — vault + `VaultReceipt` objects |
| Lending pool / loans | `use-lending.ts` — pool object + owned `LoanReceipt` |
| Private streams | `use-private-streams.ts`, Seal session, Groth16 |
| Stream labels | `stream-labels.ts` — localStorage |
| Pro groups | `pro-groups-store.ts` — localStorage per address |
| Pending borrows (UX) | `loan-ui.ts` — sessionStorage until indexed |
| Transactions | `streamline-tx.ts` PTBs + `use-gasless.ts` → `/api/sponsor` |

Gasless path: zkLogin + Enoki sponsorship for allowlisted targets (`enoki-targets.ts`). Faucet mints test USDC on user app.

---

## Key file map

```
frontend/src/
├── app/
│   ├── page.tsx              # Landing (ScrollHero only)
│   ├── app/user/page.tsx     # UserAppShell
│   └── app/pro/page.tsx      # ProDashboard
│
├── components/landing/
│   ├── ScrollHero.tsx        # Full landing experience
│   ├── heroScenes.ts         # Scene copy + phone scene IDs
│   ├── PhoneMockup.tsx       # Phone chrome + scene router
│   ├── FinanceFlowViz.tsx    # Finance + borrow flow visuals (also app panels)
│   ├── PrivacyPhonePreview.tsx
│   └── ProPhonePreview.tsx
│
├── components/app/
│   ├── user/UserAppShell.tsx # Desktop user tabs
│   ├── phone/                # Phone home, details, borrow, scan, modals
│   ├── pro/                  # Pro dashboard, groups, demo header
│   ├── FreelancerDashboard.tsx
│   ├── ClientDashboard.tsx
│   ├── CollateralPanel.tsx
│   └── YieldPanel.tsx
│
└── lib/
    ├── streamline-tx.ts      # PTB builders
    ├── use-lending.ts
    ├── use-yield.ts
    ├── loan-ui.ts            # Borrow display math + pending state
    └── stream-state.ts       # Dripping / milestone helpers
```

---

## Product claims checklist (frontend copy)

What we **tell users** across landing + apps:

- ✅ Pay as work happens — continuous drips, no invoices
- ✅ Milestone-gated flow — approve → drip; auto-approve after deadline (how-it-works copy)
- ✅ Gasless — zkLogin, sponsored txs, zero transfer fee messaging
- ✅ Yield on stream splits — finance scene + Yield tab + `create_stream_v2`
- ✅ Borrow against stream PV — 90% of remaining, lump sum now
- ✅ Drips repay loan automatically — **UI narrative** (see on-chain caveat above)
- ✅ Private streams — masked amounts, tap-to-reveal preview, Seal/Groth16 create path
- ✅ Selective disclosure — privacy scene copy (proofs on demand)
- ✅ Pro payroll — self-serve groups/substreams, yield on committed capital (**demo**)
- ✅ Global USDC — no banks / SWIFT (pro scene copy)

---

## Running locally

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

Defaults target **testnet** deployment in `constants.ts`. Set `ENOKI_PRIVATE_API_KEY` for full gasless sponsorship. See `frontend/README.md` for env variables and build commands.
