import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SuiProviders } from "@/components/providers/SuiProviders";
import { CustomCursor } from "@/components/landing/CustomCursor";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={geistMono.variable}>
      <body>
        <SuiProviders>
          <CustomCursor />
          {children}
        </SuiProviders>
      </body>
    </html>
  );
}
