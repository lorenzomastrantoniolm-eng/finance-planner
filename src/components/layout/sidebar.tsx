"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Repeat,
  Target,
  BarChart3,
  WalletCards,
  Landmark,
  ArrowLeftRight,
  Settings,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/piano-mensile", label: "Piano mensile", icon: WalletCards },
  { href: "/ricorrenti", label: "Ricorrenti", icon: Repeat },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/analisi", label: "Analisi", icon: BarChart3 },
  { href: "/obiettivi", label: "Obiettivi", icon: Target },
  { href: "/conti", label: "Conti", icon: Landmark },
  { href: "/movimenti", label: "Movimenti", icon: ArrowLeftRight },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-20 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div>
          <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
            Finance
          </div>
          <div className="text-xs text-zinc-500">
            Planner personale
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {new Intl.DateTimeFormat("it-IT", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Piano finanziario attivo
          </p>
        </div>
      </div>
    </aside>
  );
}
