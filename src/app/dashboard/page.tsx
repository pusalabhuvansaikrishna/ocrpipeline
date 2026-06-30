import { Suspense } from "react";
import DashboardContent from "./dashboard-content";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-orange-500">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}