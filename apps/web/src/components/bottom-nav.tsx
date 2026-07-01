"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, FileTextIcon, CalendarIcon, UsersIcon } from "lucide-react";
import { MoreMenu } from "./more-menu";

const tabs = [
  { href: "/", label: "홈", icon: HomeIcon, exact: true, also: [] as string[] },
  { href: "/schedule", label: "현장", icon: CalendarIcon, exact: false, also: ["/sites"] },
  { href: "/quotes", label: "견적", icon: FileTextIcon, exact: false, also: [] as string[] },
  { href: "/customers", label: "고객", icon: UsersIcon, exact: false, also: [] as string[] },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean, also: string[]) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/") || also.some((a) => pathname.startsWith(a));
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon, exact, also }) => {
          const active = isActive(href, exact, also);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-1 py-3 transition-colors active:opacity-70 ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-b-full" />
                )}
                <Icon size={26} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <MoreMenu />
      </ul>
    </nav>
  );
}
