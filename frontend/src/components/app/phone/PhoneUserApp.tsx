"use client";

import { PhoneEmbeddedProvider } from "./PhoneEmbeddedContext";
import { PhoneUserShell } from "./PhoneUserShell";

export function PhoneUserApp() {
  return (
    <PhoneEmbeddedProvider>
      <PhoneUserShell />
    </PhoneEmbeddedProvider>
  );
}
