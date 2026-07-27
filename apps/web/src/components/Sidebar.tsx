"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BellRing } from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notifications & Stuff", href: "/notifications-and-stuff", icon: BellRing }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white min-h-screen p-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3 pb-8 border-b border-gray-100">
        <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          N
        </div>
        <div>
          <h1 className="font-bold text-gray-900 tracking-tight text-base">Nox Assistant</h1>
          <p className="text-[11px] text-gray-400 font-medium">Shivansh Saxena</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-6 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
        <div className="font-medium text-gray-500">Nox v2.0</div>
        <div>Personal AI System</div>
      </div>
    </aside>
  );
}
