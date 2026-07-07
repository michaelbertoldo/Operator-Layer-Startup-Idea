"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardCheck,
  Gauge,
  ListChecks,
  PlayCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
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

type AppNavProps = {
  variant?: "sidebar" | "mobile";
};

export function AppNav({ variant = "sidebar" }: AppNavProps) {
  const pathname = usePathname();
  const mobile = variant === "mobile";

  return (
    <nav
      className={cn(
        mobile
          ? "flex gap-2 overflow-x-auto px-4 py-3 md:px-8"
          : "flex flex-1 flex-col gap-1 px-3 py-4"
      )}
      aria-label={mobile ? "Mobile navigation" : "Primary navigation"}
    >
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              mobile && "shrink-0 border",
              active
                ? mobile
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "bg-slate-950 text-white shadow-sm"
                : mobile
                  ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
