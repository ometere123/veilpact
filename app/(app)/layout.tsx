import { SealRail } from "@/components/layout/SealRail";
import { TopBar } from "@/components/layout/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void-ink">
      <SealRail />
      <TopBar />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6 lg:p-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
