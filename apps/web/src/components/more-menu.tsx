"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquareIcon,
  CameraIcon,
  DollarSignIcon,
  HelpCircleIcon,
  HardHatIcon,
  ClipboardListIcon,
  SettingsIcon,
  MoreHorizontalIcon,
  CalculatorIcon,
  SparklesIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";

// 자주 쓰는 기능은 큰 아이콘으로 크게.
// '일정'은 하단 탭('현장')으로 승격됐으므로 여기서 뺐다.
const primaryItems = [
  { href: "/workers", label: "작업자", icon: HardHatIcon },
  { href: "/messages", label: "문자", icon: MessageSquareIcon },
  { href: "/photos", label: "사진", icon: CameraIcon },
  { href: "/finance", label: "매출", icon: DollarSignIcon },
  { href: "/settings", label: "설정", icon: SettingsIcon },
];

// 가끔 쓰는 부가 기능은 작은 목록으로 아래에 정리.
const secondaryItems = [
  { href: "/workers/attendance", label: "장부", icon: ClipboardListIcon },
  { href: "/materials", label: "자재산출", icon: CalculatorIcon },
  { href: "/moodboard", label: "AI 시각화", icon: SparklesIcon },
  { href: "/instagram", label: "인스타", icon: ImageIcon },
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
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden w-72 max-w-[90vw]">
          {/* 자주 쓰는 기능 — 큰 아이콘 */}
          <div className="grid grid-cols-3 gap-1 p-2">
            {primaryItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-base font-medium text-gray-800 active:bg-blue-50"
              >
                <Icon size={32} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                {label}
              </Link>
            ))}
          </div>

          {/* 부가 기능 — 작은 목록 */}
          <div className="border-t border-gray-100 bg-gray-50 px-3 pt-2 pb-1">
            <p className="px-1 pb-1 text-xs font-semibold text-gray-400">부가 기능</p>
            {secondaryItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-2 py-4 text-base text-gray-700 active:bg-gray-100"
              >
                <Icon size={22} className="text-gray-500 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
