export type PhoneScene =
  | "dashboard"
  | "drip"
  | "states"
  | "stats"
  | "finance"
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

export type PanelMode = "tiles" | "full";

export type HeroScene = {
  id: string;
  phone: PhoneScene;
  theme: SceneTheme;
  panelMode?: PanelMode;
  left: ScenePanel;
  right: ScenePanel;
};

export const HERO_SCENES: HeroScene[] = [
  {
    id: "hero",
    phone: "dashboard",
    theme: "light",
    panelMode: "tiles",
    left: {
      label: "",
      headline: "Get paid as",
      accent: "you work.",
      body: "Not when you invoice. Not when they remember.",
      bullets: [],
    },
    right: {
      label: "",
      headline: "Continuous,",
      accent: "private income.",
      body: "Turn any contract into a stream on Sui — gasless, automatic, yours.",
      bullets: [],
    },
  },
  {
    id: "problem",
    phone: "drip",
    theme: "light",
    left: {
      label: "The problem",
      headline: "Finish Tuesday.",
      accent: "Paid Friday.",
      body: "You finish the work on Tuesday. The wire arrives on Friday — if you're lucky. Rent is due, groceries need buying, and you've already started the next project.",
      bullets: [
        "Invoices mean waiting",
        "Payday gaps while bills don't wait",
        "Work is continuous — payment isn't",
      ],
    },
    right: {
      label: "And on-chain",
      headline: "It's all",
      accent: "public.",
      body: "Your salary, your contractor rate, your client's name — anyone with a browser can see it. Or you're the one hiring: pay upfront and hope, or pay late and feel guilty. There's no good option.",
      bullets: [
        "Rates and relationships exposed",
        "Clients can't trust without locking funds",
        "StreamLine fixes all three",
      ],
    },
  },
  {
    id: "how",
    phone: "states",
    theme: "light",
    left: {
      label: "How it works",
      headline: "Money flows",
      accent: "as you work.",
      body: "Lock the full amount once. Define your milestones. Client approves a checkpoint — and the stream opens. From that moment, money drips into your wallet continuously. Every minute. While you sleep.",
      bullets: [
        "Lock — full amount committed upfront",
        "Drip — USDC arrives gaslessly, in real time",
        "Done — clean record when milestones finish",
      ],
      metric: { value: "3", label: "steps — that's it" },
    },
    right: {
      label: "No chasing",
      headline: "Silence is not",
      accent: "a veto.",
      body: "No invoice. No waiting. No chasing. If the client goes quiet after you deliver, the stream auto-approves after 48 hours. You can't be ghosted out of your payment.",
      bullets: [
        "One tap to mark a milestone complete",
        "Client approves — streaming resumes",
        "48h silence → auto-approve",
      ],
      metric: { value: "48h", label: "auto-approve window" },
    },
  },
  {
    id: "privacy",
    phone: "stats",
    theme: "light",
    left: {
      label: "Privacy",
      headline: "Your salary is",
      accent: "nobody's business.",
      body: "On most blockchains, every payment is public. Your rate, your client, your earnings — all readable by anyone. StreamLine is private by default. Who you're paying. How much. Hidden on-chain.",
      bullets: [
        "Contractor rates stay yours",
        "Colleagues don't need to know your pay",
        "Freelancers control their pricing",
      ],
    },
    right: {
      label: "When you need proof",
      headline: "Share earnings",
      accent: "cryptographically.",
      body: "Accountant, bank, tax authority — share a proof they can verify. No PDFs. No screenshots. Visible only to you, and whoever you choose to show.",
      bullets: [
        "Selective disclosure on your terms",
        "Verifiable income history",
        "Private by default — no setup required",
      ],
      metric: { value: "$0", label: "to prove your earnings" },
    },
  },
  {
    id: "finance",
    phone: "finance",
    theme: "light",
    left: {
      label: "While it waits",
      headline: "Locked money",
      accent: "earns yield.",
      body: "$4,000 locked for a three-week project? It doesn't sit idle — it routes into Scallop and earns from day one. Every drip reduces principal. The yield keeps running on the rest.",
      bullets: [
        "Idle capital works for both sides",
        "Split once — spending, savings, yield",
        "Fires automatically on every drip",
      ],
    },
    right: {
      label: "Need cash now",
      headline: "Borrow against",
      accent: "your stream.",
      body: "$3,000 stream running, two weeks left, need cash today? Borrow against future income now. The loan repays itself from your drips — no manual payments, no liquidation risk.",
      bullets: [
        "Stream present value as collateral",
        "Auto-repay from incoming drips",
        "Position gets healthier every day",
      ],
      metric: { value: "24/7", label: "repayment from drips" },
    },
  },
  {
    id: "pro",
    phone: "pro",
    theme: "pro",
    left: {
      label: "StreamLine.pro",
      headline: "Open a pay run.",
      accent: "It runs itself.",
      body: "Run contractor payroll, vendor milestones, and global disbursements from one dashboard. Create streams in bulk, lock funds per engagement, and let drips settle continuously — private and auditable.",
      bullets: [
        "Pay runs for 500+ contractors at once",
        "Milestone approvals in batch",
        "Finance-team roles and permissions",
      ],
      metric: { value: "500+", label: "payees per org" },
    },
    right: {
      label: "For the business",
      headline: "Funds locked.",
      accent: "You stay in control.",
      body: "Commit the full amount upfront so workers trust the job — but approve each milestone before money flows. Cancel anytime on unstreamed balance. No wires, no invoice chasing, no public payroll on-chain.",
      bullets: [
        "zkLogin onboarding — no seed phrase for contractors",
        "Multi-sig on large disbursements",
        "Compliance-ready payment history on export",
      ],
      metric: { value: "24/7", label: "automated settlement" },
    },
  },
  {
    id: "launch",
    phone: "launch",
    theme: "light",
    left: {
      label: "",
      headline: "",
      accent: "",
      body: "",
      bullets: [],
    },
    right: {
      label: "",
      headline: "",
      accent: "",
      body: "",
      bullets: [],
    },
  },
];

export const SCENE_COUNT = HERO_SCENES.length;

export function sceneIsPro(index: number): boolean {
  return HERO_SCENES[index]?.theme === "pro";
}
