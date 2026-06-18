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
  rightExtra?: ScenePanel;
};

export const HERO_SCENES: HeroScene[] = [
  {
    id: "hero",
    phone: "dashboard",
    theme: "light",
    panelMode: "tiles",
    left: {
      label: "",
      headline: "Moving money at",
      accent: "the  speed of work.",
      body: "Programmable Micropayments",
      bullets: [],
    },
    right: {
      label: "",
      headline: "Continuously, ",
      accent: "Securely & Privately.",
      body: "Gasless, yield-bearing, liquid.",
      bullets: [],
    },
  },
  {
    id: "how",
    phone: "states",
    theme: "light",
    left: {
      label: "open your stream",
      headline: "Get paid as you Work",
      accent: "in Real time.",
      body: "No invoices. No wires. No waiting. Open a stream in seconds, and start recieving USDC in real time.",
      bullets: [
     ],
    },
    right: {
      label: "decentralised",
      headline: "Smart contracts ",
      accent: "replace the handshake.",
      body: "Flows only when milestones are approved. Auditable by all parties.",
      bullets: [
    ],
    },
  },
  {
    id: "finance",
    phone: "finance",
    theme: "light",
    left: {
      label: "earn more",
      headline: "Earn Yield ",
      accent: "with your Stream.",
      body: "$4,000 locked for a three-week project? It doesn't sit idle, it routes into defi and earns from start.",
      bullets: [
        "Idle capital works for both sides",
        "Split once — spending, savings, yield",
        "Fires automatically on every drip",
      ],
    },
    right: {
      label: "Use Anytime",
      headline: "Borrow against",
      accent: "your stream.",
      body: "$3,000 stream running, two weeks left, need cash today? Borrow against future income now. The loan repays itself from your drips — no manual payments, no liquidation risk.",
      bullets: [
        "Stream present value as collateral",
        "Auto-repay from incoming drips",
        "Position gets healthier every day",
      ],
    },
  },
  {
    id: "privacy",
    phone: "stats",
    theme: "light",
    left: {
      label: "Remain Private",
      headline: "Your salary is",
      accent: "nobody's business.",
      body: "You don't want salary, rates, clients visible on-chain, so use your streams privately. No configuration needed.",
      bullets: [
  
      ],
    },
    right: {
      label: "Provable on demand",
      headline: "Share earnings",
      accent: "cryptographically.",
      body: "Accountant, bank, tax authority — share a proof they can verify. Streamline gives you selective disclosure on your terms, visible only to you, and whoever you choose to show.",
      bullets: [
   
      ],
    },
  },
  {
    id: "pro",
    phone: "pro",
    theme: "pro",
    left: {
      label: "Manage Payrolls",
      headline: "Payroll that  ",
      accent: "runs itself.",
      body: "Run contractor payroll, vendor milestones, and global disbursements from one dashboard. Create in bulk, lock per engagement, and let drips settle continuously, private and auditable.",
      bullets: [
        "Pay runs for 500+ contractors at once",
        "Team-based roles and permissions",
       "Milestones & approvals in batch",

      ],
    },
    right: {
      label: "global & instant",
      headline: "Zero Borders",
      accent: "Zero Banks",
      body: "USDC streams to anyone, anywhere, instantly. No SWIFT. No correspondent banks. No conversion fees. Same experience for a contractor in Lagos as an employee in London. Plus, the compliance-ready history is always audit ready.",
      bullets: [
      ],
    },
    rightExtra: {
      label: "Efficient capital",
      headline: "Your Capital",
      accent: "Works Harder.",
      body: "Every dollar committed to a stream earns yield before it reaches your team. Recover up to 12% APY on payroll capital automatically — no treasury management, no extra steps.",
      bullets: [

      ],
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
