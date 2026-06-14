"use client";

import { useState } from "react";

import { StreamCreator } from "../StreamCreator";
import { FreelancerDashboard } from "../FreelancerDashboard";
import { ClientDashboard } from "../ClientDashboard";
import { ConfidentialDemo } from "../ConfidentialDemo";
import { PhoneSegmentTabs } from "./PhoneSegmentTabs";

type StreamsSection = "all" | "create" | "confidential";

const SECTIONS = [
  { id: "all" as const, label: "All" },
  { id: "create" as const, label: "Create" },
  { id: "confidential" as const, label: "Confidential" },
];

export function PhoneStreamsPanel() {
  const [section, setSection] = useState<StreamsSection>("all");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PhoneSegmentTabs
        tabs={SECTIONS}
        active={section}
        onChange={setSection}
      />

      <div className="mt-4 min-h-0 flex-1">
        {section === "all" && (
          <div className="space-y-6">
            <FreelancerDashboard />
            <ClientDashboard />
          </div>
        )}
        {section === "create" && <StreamCreator />}
        {section === "confidential" && <ConfidentialDemo />}
      </div>
    </div>
  );
}
