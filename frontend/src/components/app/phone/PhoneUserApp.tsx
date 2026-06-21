"use client";

import { PhoneEmbeddedProvider } from "./PhoneEmbeddedContext";
import { PhoneUserShell } from "./PhoneUserShell";
import type { PhoneAppRoute } from "./types";

type PhoneUserAppProps = {
  onNavigate: (route: PhoneAppRoute) => void;
};

export function PhoneUserApp({ onNavigate }: PhoneUserAppProps) {
  return (
    <PhoneEmbeddedProvider>
      <PhoneUserShell onNavigate={onNavigate} />
    </PhoneEmbeddedProvider>
  );
}
