import { Activity } from "lucide-react";
import { ControlsClient } from "@/app/controls-client";
import { AppNav } from "@/components/shell/app-nav";
import { prisma } from "@/lib/prisma";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const company = await prisma.company.findFirst();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">OperatorLayer Lite</p>
                <p className="text-xs text-slate-500">Agent spend controls</p>
              </div>
            </div>
          </div>
          <AppNav />
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Phase 1
              </p>
              <p className="mt-1 text-sm text-emerald-900">Fake payment executor only</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <p className="text-sm font-semibold">OperatorLayer Lite</p>
              <p className="text-xs text-slate-500">Agent spend controls</p>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">
              Non-custodial authorization, policy checks, risk checks, audit logs
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                Demo workspace
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                Simulated spend
              </span>
            </div>
          </div>
        </header>
        <div className="border-b border-slate-200 bg-slate-50 lg:hidden">
          <AppNav variant="mobile" />
        </div>
        {company?.frozenAt ? (
          <section className="border-b border-red-200 bg-red-50 px-4 py-3 md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-950">
                  Company spend is frozen
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {company.freezeReason ??
                    "All agent spend requests are blocked before budget reservation."}
                </p>
              </div>
              <ControlsClient
                scope="company"
                frozen
                reason={company.freezeReason}
                compact
              />
            </div>
          </section>
        ) : null}
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
