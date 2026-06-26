"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  MessageSquareIcon,
  UsersIcon,
  CameraIcon,
  DollarSignIcon,
  HelpCircleIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";

const items = [
  { href: "/schedule", label: "일정", icon: CalendarIcon },
  { href: "/messages", label: "문자", icon: MessageSquareIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
  { href: "/photos", label: "사진", icon: CameraIcon },
  { href: "/finance", label: "매출", icon: DollarSignIcon },
  { href: "/help", label: "도움말", icon: HelpCircleIcon },
];

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <li ref={ref} className="flex-1 relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex flex-col items-center gap-1 py-3 transition-colors ${
          open ? "text-blue-600" : "text-gray-500"
        }`}
        aria-expanded={open}
        aria-label="더보기 메뉴"
      >
        {open ? (
          <XIcon size={26} strokeWidth={1.5} />
        ) : (
          <MoreHorizontalIcon size={26} strokeWidth={1.5} />
        )}
        <span className="text-xs font-medium">더보기</span>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden w-44">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 text-base text-gray-700 active:bg-gray-100 border-b border-gray-100 last:border-0"
            >
              <Icon size={20} className="text-gray-500 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}
