"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Ticket,
  Users,
  UserCircle,
  MessageCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: KanbanSquare },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "CleverChat", href: "/cleverchat", icon: MessageCircle },
];

const settingsNav = [
  { name: "Nutzer", href: "/settings/users", icon: Users },
  { name: "Profil", href: "/settings/profile", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-60 bg-white flex flex-col">
      <div className="h-16 flex items-center px-5">
        <img
          src="/cleverlegal_logo.png"
          alt="clever.legal"
          className="h-10 w-auto"
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Hauptmenue
        </p>
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${active ? "text-primary-600" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}

        <p className="px-3 pt-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Einstellungen
        </p>
        {settingsNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${active ? "text-primary-600" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-200">
        <p className="text-[11px] text-slate-400">&copy; {new Date().getFullYear()} clever.legal GmbH</p>
      </div>
    </aside>
  );
}
