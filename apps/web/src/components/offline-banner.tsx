"use client";

import { useEffect } from "react";
import { WifiOffIcon, RefreshCwIcon, CheckCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useOutbox } from "@/lib/offline/use-outbox";

export function OfflineBanner() {
  const { isOnline, pending, isSyncing, lastSync, sync } = useOutbox();

  // 재연결 성공 시 토스트
  useEffect(() => {
    if (lastSync && lastSync.synced > 0) {
      toast.success(`${lastSync.synced}건 동기화 완료`);
    }
  }, [lastSync]);

  if (isOnline && pending === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
        isOnline
          ? "bg-warning/90 text-warning-foreground"
          : "bg-foreground/95 text-background"
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCwIcon size={16} className={isSyncing ? "animate-spin" : ""} />
          <span className="flex-1">
            {isSyncing ? "동기화 중..." : `저장 대기 ${pending}건 — 동기화 필요`}
          </span>
          {!isSyncing && (
            <button
              onClick={() => void sync()}
              className="bg-background/20 px-3 py-1 rounded-lg text-xs font-bold"
            >
              지금 동기화
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOffIcon size={16} />
          <span className="flex-1">
            오프라인
            {pending > 0 ? ` · ${pending}건 저장 대기 중` : " · 연결 시 자동 동기화"}
          </span>
          <CheckCircleIcon size={14} className="text-background/60" />
        </>
      )}
    </div>
  );
}
