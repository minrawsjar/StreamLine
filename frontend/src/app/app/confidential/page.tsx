import { ConfidentialStreams } from "@/components/app/ConfidentialStreams";

export const metadata = {
  title: "Confidential amounts",
};

export default function ConfidentialPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f1f4f5] px-6 py-12">
      <div className="mx-auto max-w-[1000px]">
        <ConfidentialStreams />
      </div>
    </main>
  );
}
