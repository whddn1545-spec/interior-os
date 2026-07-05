"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { syncOutbox, pendingCount } from "./outbox";

// 온라인 상태는 useSyncExternalStore로 구독한다.
// 기존 useState(navigator.onLine) 방식은 두 가지 버그가 있었다:
// 1) 서버 렌더(true)와 클라이언트 첫 렌더 값이 달라 하이드레이션 에러(#418) 유발
// 2) 마운트 순간 잠깐 오프라인이었으면 online 이벤트가 다시 오기 전까지
//    영영 '오프라인' 배너가 떠 있음 (stale state)
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOutbox() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true // 서버 스냅샷 — SSR과 하이드레이션 일치
  );
  const [pending, setPending] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ synced: number; errors: number } | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await pendingCount();
    setPending(count);
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await syncOutbox();
      setLastSync(result);
      if (result.synced > 0) await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount();
  }, [refreshCount]);

  // 오프라인 → 온라인 복귀 시 자동 동기화 (외부 이벤트 반응이라 effect 내 상태 변경이 의도된 동작)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOnline) void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return { isOnline, pending, isSyncing, lastSync, sync, refreshCount };
}
