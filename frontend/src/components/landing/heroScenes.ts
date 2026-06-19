export type PhoneScene =
  | "dashboard"
  | "drip"
  | "states"
  | "stats"
  | "finance"
  | "privacy"
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
  headlineLarge?: boolean;
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
      body: "Money shouldn't sit idle, so split your stream into yield, and savings, and let your earnings compound from the 1st second. Automatically.",
      bullets: [
      ],
      headlineLarge: true,
    },
    right: {
      label: "Use Anytime",
      headline: "Borrow against",
      accent: "your stream.",
      body: "Need cash today? Borrow against your stream's present value — one lump sum now, then part of your stream repays the lender automatically. No liquidation risk. No manual payments. No worries about collateral health.",
      bullets: [

      ],
    },
  },
  {
    id: "privacy",
    phone: "privacy",
    theme: "light",
    left: {
      label: "Remain Private",
      headline: "Your money is",
      accent: "nobody's business.",
      body: "When you don't want salary, rates or clients visible on-chain, use your streams privately. No configuration needed.",
      bullets: [
  
      ],
      headlineLarge: true,
    },
    right: {
      label: "Provable on demand",
      headline: "Audit trail &",
      accent: "Selective Disclosure.",
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
