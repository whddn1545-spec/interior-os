"use client";

import { useState } from "react";
import Link from "next/link";
import { SparklesIcon, XIcon, CheckIcon } from "lucide-react";

const PRO_FEATURES = [
  "AI 통화 상담 문서화 무제한",
  "AI 완공 리포트 자동 생성",
  "AI 점검 안내 문자 작성",
  "현장·고객·견적 무제한",
  "모든 AI 기능 무제한",
];

interface ProGateProps {
  feature: string;
  children?: React.ReactNode;
  /** 클릭 트리거 없이 직접 열고 싶을 때 */
  isOpen?: boolean;
  onClose?: () => void;
}

function ProModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-card w-full rounded-t-3xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <SparklesIcon size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Pro 기능</p>
              <h2 className="text-lg font-bold text-foreground">{feature}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground">
            <XIcon size={20} />
          </button>
        </div>

        <p className="text-base text-muted-foreground mb-4">
          Pro 플랜에서 AI 기능을 무제한으로 사용하세요.
        </p>

        <ul className="space-y-2.5 mb-6">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-base text-foreground">
              <CheckIcon size={16} className="text-profit shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <SparklesIcon size={18} />
            Pro 시작하기 · ₩39,000/월
          </Link>
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl border border-border text-base font-medium text-muted-foreground"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}

/** 클릭 트리거가 있는 래퍼 (기본 사용) */
export function ProGate({ feature, children, isOpen, onClose }: ProGateProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : localOpen;
  const close = onClose ?? (() => setLocalOpen(false));

  if (isOpen !== undefined) {
    return open ? <ProModal feature={feature} onClose={close} /> : null;
  }

  return (
    <>
      <div onClick={() => setLocalOpen(true)} className="cursor-pointer">
        {children}
      </div>
      {open && <ProModal feature={feature} onClose={close} />}
    </>
  );
}

export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/12 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
      <SparklesIcon size={10} />
      PRO
    </span>
  );
}
