"use client";

import { PhoneEmbeddedProvider } from "./PhoneEmbeddedContext";
import { ProPhoneAppRoot } from "../pro/ProShell";

export function PhoneProApp() {
  return (
    <PhoneEmbeddedProvider>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ProPhoneAppRoot />
      </div>
    </PhoneEmbeddedProvider>
  );
}
