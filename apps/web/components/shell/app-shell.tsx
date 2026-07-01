import Link from "next/link";
import {
  Activity,
  Bot,
  ClipboardCheck,
  Gauge,
  ListChecks,
  PlayCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  Store
} from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/requests", label: "Requests", icon: ListChecks },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/demo", label: "Demo", icon: PlayCircle },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: AppShellProps) {
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
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
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
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

