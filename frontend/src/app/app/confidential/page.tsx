import { ConfidentialDemo } from "@/components/app/ConfidentialDemo";

export const metadata = {
  title: "Confidential amounts",
};

export default function ConfidentialPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f1f4f5]">
      <ConfidentialDemo />
    </main>
  );
}
