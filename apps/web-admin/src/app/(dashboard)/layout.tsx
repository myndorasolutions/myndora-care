import { Suspense } from "react";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-muted">
          Opening dashboard...
        </div>
      }
    >
      <DashboardFrame>{children}</DashboardFrame>
    </Suspense>
  );
}
