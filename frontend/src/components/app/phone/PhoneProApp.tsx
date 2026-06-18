"use client";

import { PhoneEmbeddedProvider } from "./PhoneEmbeddedContext";
import { ProDashboard } from "../pro/ProDashboard";

export function PhoneProApp() {
  return (
    <PhoneEmbeddedProvider>
      <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ProDashboard />
      </div>
    </PhoneEmbeddedProvider>
  );
}
