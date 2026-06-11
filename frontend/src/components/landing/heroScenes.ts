export type PhoneScene =
  | "dashboard"
  | "drip"
  | "states"
  | "stats"
  | "pro"
  | "launch";

export type SceneTheme = "light" | "pro";

export type ScenePanel = {
  label: string;
  headline: string;
  accent: string;
  body: string;
  bullets: string[];
  metric?: { value: string; label: string };
};

export type HeroScene = {
  id: string;
  phone: PhoneScene;
  theme: SceneTheme;
  left: ScenePanel;
  right: ScenePanel;
};

export const HERO_SCENES: HeroScene[] = [
  {
    id: "earn",
    phone: "dashboard",
    theme: "light",
    left: {
      label: "For freelancers & creators",
      headline: "Income that flows",
      accent: "with your work.",
      body: "Stop invoicing and chasing payments. StreamLine drips USDC to your wallet every 60 seconds while milestones unlock — no claims, no gas, no waiting.",
      bullets: [
        "Live balance updates as you deliver",
        "Milestone gates protect both sides",
        "zkLogin — sign up with Google in seconds",
      ],
      metric: { value: "$0.00", label: "fee per drip" },
    },
    right: {
      label: "Real-time settlement",
      headline: "Every second",
      accent: "counts.",
      body: "Keepers settle on-chain at ≤60s intervals. Your earned amount ticks up continuously — like a salary, but tied to output, not a calendar.",
      bullets: [
        "Address Balances — zero-fee transfers",
        "No wallet action needed to receive",
        "Works with USDC, USDsui, and more",
      ],
      metric: { value: "≤60s", label: "settlement cycle" },
    },
  },
  {
    id: "arrive",
    phone: "drip",
    theme: "light",
    left: {
      label: "The EVM problem",
      headline: "Money that",
      accent: "actually lands.",
      body: "Sablier, Superfluid, LlamaPay — recipients must pay gas to claim accumulated balance. On StreamLine, funds arrive in your wallet automatically. Every drip. Every time.",
      bullets: [
        "No claim() transaction required",
        "No relayer subsidies to maintain",
        "Continuous delivery, not batch withdrawals",
      ],
      metric: { value: "0", label: "actions to receive" },
    },
    right: {
      label: "Gasless by design",
      headline: "Built on Sui's",
      accent: "send_funds.",
      body: "Protocol-level zero-fee transfers via 0x2::balance::send_funds. Not a hack, not a promo — a primitive that makes per-minute streaming economically viable.",
      bullets: [
        "Payer and payee both pay $0",
        "Scales to micropayments of any size",
        "Sponsored txs via Enoki for onboarding",
      ],
      metric: { value: "100%", label: "gasless drips" },
    },
  },
  {
    id: "flow",
    phone: "states",
    theme: "light",
    left: {
      label: "Trust without lawyers",
      headline: "Milestones",
      accent: "enforced on-chain.",
      body: "Five states — LOCKED, PENDING, DRIPPING, PAUSED, DONE — governed by Move entry functions. Clients can't drain early. Freelancers can't skip deliverables.",
      bullets: [
        "create_stream() locks full amount upfront",
        "raise_completion() starts review window",
        "raise_dispute() pauses — funds stay locked",
      ],
      metric: { value: "5", label: "on-chain states" },
    },
    right: {
      label: "Silence = approval",
      headline: "Auto-approve",
      accent: "protects you.",
      body: "Client ghosts after you deliver? After 48 hours the keeper calls approve_milestone() automatically. You keep dripping. They're not holding your money hostage.",
      bullets: [
        "Configurable review deadlines per stream",
        "Keeper network executes settlements",
        "1 bps tip — negligible at any scale",
      ],
      metric: { value: "48h", label: "default review window" },
    },
  },
  {
    id: "sui",
    phone: "stats",
    theme: "light",
    left: {
      label: "Why Sui-native",
      headline: "Impossible on",
      accent: "Ethereum.",
      body: "PTB atomicity runs pay + save + invest splits in one transaction — fail one leg, revert all. Move object ownership means the locked balance is structurally unreachable except through protocol logic.",
      bullets: [
        "Atomic composable splits per drip",
        "No reentrancy or approval exploits",
        "Shared objects with typed capabilities",
      ],
      metric: { value: "1", label: "atomic PTB per drip" },
    },
    right: {
      label: "The stack",
      headline: "Every primitive",
      accent: "in place.",
      body: "Address Balances for free transfers. PTBs for atomicity. Move for safety. zkLogin for onboarding. Scallop & NAVI for yield routing. This is a protocol only Sui enables.",
      bullets: [
        "USDC · USDsui · SuiUSDe · USDY",
        "Google OAuth → Sui address",
        "Composability with DeFi protocols",
      ],
      metric: { value: "4+", label: "stablecoins supported" },
    },
  },
  {
    id: "pro",
    phone: "pro",
    theme: "pro",
    left: {
      label: "StreamLine.pro",
      headline: "Payroll for the",
      accent: "on-chain era.",
      body: "Enterprise dashboard for companies managing contractor payroll, milestone-based vendor payments, and global disbursements — all streaming, all auditable, all on Sui.",
      bullets: [
        "Bulk stream creation for 500+ payees",
        "Role-based access for finance teams",
        "Export-ready audit trails per drip",
      ],
      metric: { value: "500+", label: "payees per org" },
    },
    right: {
      label: "Finance teams",
      headline: "One dashboard.",
      accent: "Every payout.",
      body: "Schedule payroll runs, approve milestones in batch, route splits to treasury and yield. Replace manual wires and invoicing with programmable money that respects your approval workflows.",
      bullets: [
        "Automated contractor onboarding via zkLogin",
        "Multi-sig approval for large disbursements",
        "Compliance-ready payment history",
      ],
      metric: { value: "24/7", label: "automated settlement" },
    },
  },
  {
    id: "launch",
    phone: "launch",
    theme: "light",
    left: {
      label: "Get started",
      headline: "Web app",
      accent: "live now.",
      body: "Connect a wallet or sign in with Google. Create your first stream in under a minute. Mobile apps for iOS and Android launching soon.",
      bullets: [
        "Payer or receiver — pick your role",
        "Test on Sui testnet today",
        "Built for Sui Overflow 2026",
      ],
    },
    right: {
      label: "Mobile",
      headline: "Apps",
      accent: "coming soon.",
      body: "Native iOS and Android apps with push notifications for drips, milestone alerts, and one-tap approvals. Scan below when they drop.",
      bullets: [
        "Real-time drip notifications",
        "Biometric sign-in",
        "Offline milestone review queue",
      ],
    },
  },
];

export const SCENE_COUNT = HERO_SCENES.length;

export function sceneIsPro(index: number): boolean {
  return HERO_SCENES[index]?.theme === "pro";
}
