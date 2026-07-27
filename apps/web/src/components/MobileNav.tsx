"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BellRing } from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notifications & Stuff", href: "/notifications-and-stuff", icon: BellRing }
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-4 py-2 flex items-center justify-around shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold py-1 px-6 rounded-xl transition ${
              isActive ? "text-gray-900 bg-gray-100" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-gray-900" : "text-gray-400"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
