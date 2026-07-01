"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";

export function Fab({ href, label = "새로 만들기" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed right-5 z-40 bottom-[calc(env(safe-area-inset-bottom)+84px)]
                 flex items-center gap-2 h-14 pl-4 pr-5 rounded-full
                 bg-primary text-primary-foreground shadow-lg shadow-primary/30
                 motion-safe:active:scale-95 transition-transform"
    >
      <PlusIcon size={24} strokeWidth={2.5} />
      <span className="text-[17px] font-bold">{label}</span>
    </Link>
  );
}
