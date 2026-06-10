# StreamLine — Frontend

The StreamLine web app: a marketing landing page plus the dApp where clients create streams, freelancers watch money arrive in real time, and either side manages milestones — all gasless via zkLogin + Enoki-sponsored transactions.

- **Framework:** Next.js 15 (App Router) · React 19
- **Styling:** Tailwind CSS v4 · sharp-corner / monospace aesthetic · three.js **Bayer-dither** hero
- **Sui:** `@mysten/dapp-kit`, `@mysten/sui` (PTBs), `@mysten/enoki` (zkLogin + sponsorship)

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (Turbopack)
npm run build      # production build
npm run start      # serve the production build
npm run lint
```

The app ships pointing at the **live testnet deployment** — the StreamLine package ID and mintable test-USDC type are baked into `src/lib/constants.ts`, so no env setup is needed to click around. Sponsorship (full gasless) turns on when `ENOKI_PRIVATE_API_KEY` is set.

## Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page (hero, stats, how-it-works, why-Sui, compare)
│   ├── app/page.tsx             # The dApp shell (role select → dashboards)
│   ├── layout.tsx               # Root layout, fonts, SuiProviders, custom cursor
│   ├── globals.css              # Tailwind v4 theme + brand palette
│   └── api/sponsor/             # Enoki sponsorship proxy (holds the secret key server-side)
│       ├── route.ts             #   GET enabled? · POST sponsor a tx kind
│       └── execute/route.ts     #   POST submit the signed sponsored tx
│
├── components/
│   ├── landing/                 # HeroSection, StatsStrip, HowItWorks, WhySui, Comparison, Footer, nav, cursor
│   ├── hero/                    # BayerDitherHero (interactive water ripples), BayerDitherImage, shared shader
│   ├── app/                     # AppShell, RoleSelect, ClientDashboard, FreelancerDashboard, StreamCreator
│   ├── wallet/                  # WalletButton, ConnectModal, AccountMenu, FaucetButton
│   └── providers/               # SuiProviders, RegisterEnokiWallets
│
└── lib/
    ├── networks.ts              # dApp Kit network config (mainnet/testnet/devnet)
    ├── constants.ts             # Package IDs, test-USDC, RPC endpoints (no dApp Kit import — server-safe)
    ├── streamline-tx.ts         # PTB builders: create_stream, raise/approve, drip, collateralize
    ├── stream-math.ts           # Accrual / drip-interval math (mirrors the Move contract)
    ├── stream-state.ts          # State-machine helpers + labels
    ├── use-gasless.ts           # Hook: sponsor + execute via the /api/sponsor proxy
    ├── enoki-targets.ts         # Allowlisted Move-call targets for sponsorship
    ├── indexer.ts               # REST + WebSocket client for the Rust indexer
    └── format.ts                # USDC / address / duration formatting
```

## Gasless transactions

Two layers keep users gasless:

1. **zkLogin (Enoki)** — Google sign-in produces a Sui address; users never manage keys or buy SUI.
2. **Sponsorship** — PTBs are built with `onlyTransactionKind: true`, sent to `/api/sponsor` which calls the Enoki REST API server-side (the secret key never reaches the browser), signed by the user, then submitted via `/api/sponsor/execute`. Only allowlisted Move-call targets (`enoki-targets.ts`) can be sponsored.

On testnet, the **faucet** (`FaucetButton`) mints test USDC from the shared `TreasuryCap` so you can fund a stream end-to-end.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_DEFAULT_NETWORK` | `testnet` | Active Sui network. |
| `NEXT_PUBLIC_PACKAGE_ID_TESTNET` | baked-in testnet package | Override the StreamLine package. |
| `NEXT_PUBLIC_USDC_TYPE_TESTNET` | test USDC type | Override the streamed coin type. |
| `NEXT_PUBLIC_INDEXER_URL` / `_WS_URL` | local indexer | REST + WebSocket endpoints. |
| `ENOKI_PRIVATE_API_KEY` | _unset_ | **Server-only** sponsor key; enables gasless when present. |
| `NEXT_PUBLIC_ENOKI_API_KEY` | _unset_ | Public Enoki key for zkLogin wallet registration. |

> `ENOKI_PRIVATE_API_KEY` must never be exposed to the client — it's read only inside `app/api/sponsor/*` route handlers.

## The Bayer-dither hero

`components/hero/` renders a looping video (or still image) through a real WebGL **ordered-dithering** shader, recolored to StreamLine's palette. Cursor movement injects ripples into a water simulation that feeds the dither — "money flowing." It falls back to a static image if the video can't load. See `bayerDitherShared.ts` for the shader + Bayer matrix.
