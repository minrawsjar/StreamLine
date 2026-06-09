import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SuiProviders } from "@/components/providers/SuiProviders";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "StreamLine — Programmable Micropayments on Sui",
    template: "%s | StreamLine",
  },
  description:
    "Gasless, milestone-gated, composable payment streams on Sui. Money that drips in real time as you work.",
  applicationName: "StreamLine",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <SuiProviders>{children}</SuiProviders>
      </body>
    </html>
  );
}
