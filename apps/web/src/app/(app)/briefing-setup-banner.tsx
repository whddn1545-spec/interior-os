"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { XIcon, SunriseIcon } from "lucide-react";

const DISMISSED_KEY = "briefing_banner_dismissed_v1";

/**
 * 아침 브리핑 설정 유도 배너 — 사장님 번호가 없는 동안만 노출.
 * 번호를 설정하면 서버 조건에서 아예 렌더링되지 않고, 닫으면 localStorage로 다시 안 뜬다.
 */
export function BriefingSetupBanner() {
  const [dismissed, setDismissed] = useState(true); // 서버 렌더링 중 숨김

  useEffect(() => {
    // localStorage는 클라이언트 전용이라 마운트 후 1회 동기화가 필요 (pwa-install-banner와 동일 패턴)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(DISMISSED_KEY)) setDismissed(false);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/40 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 bg-warning rounded-xl flex items-center justify-center">
          <SunriseIcon size={22} className="text-warning-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground">매일 아침 7시 반, 문자 한 통으로 하루 준비</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            오늘 공사·받을 돈·답 없는 견적을 아침에 문자로 알려드려요
          </p>
        </div>
        <button onClick={dismiss} className="p-1 text-muted-foreground shrink-0" aria-label="닫기">
          <XIcon size={18} />
        </button>
      </div>
      <Link
        href="/settings"
        className="mt-3 flex w-full items-center justify-center bg-warning text-warning-foreground rounded-xl py-3 text-base font-bold active:opacity-90"
      >
        번호 넣고 브리핑 받기
      </Link>
    </div>
  );
}
