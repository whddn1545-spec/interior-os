"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, FileTextIcon, CalendarIcon, UsersIcon } from "lucide-react";
import { MoreMenu } from "./more-menu";

const tabs = [
  { href: "/", label: "홈", icon: HomeIcon, exact: true, also: [] as string[] },
  { href: "/sites", label: "현장", icon: CalendarIcon, exact: false, also: ["/schedule"] },
  { href: "/quotes", label: "견적", icon: FileTextIcon, exact: false, also: [] as string[] },
  { href: "/customers", label: "고객", icon: UsersIcon, exact: false, also: [] as string[] },
];

interface BottomNavProps {
  homeBadge?: number;
}

export function BottomNav({ homeBadge = 0 }: BottomNavProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean, also: string[]) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/") || also.some((a) => pathname.startsWith(a));
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/85 backdrop-blur-xl saturate-150 border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon, exact, also }) => {
          const active = isActive(href, exact, also);
          const badge = href === "/" && homeBadge > 0 ? homeBadge : 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-16 py-2.5 transition-colors motion-safe:active:scale-[0.96] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-full" />
                )}
                <span className="relative inline-flex">
                  <Icon size={26} strokeWidth={active ? 2.5 : 1.75} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-loss text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[13px] ${active ? "font-bold" : "font-medium"}`}>
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
