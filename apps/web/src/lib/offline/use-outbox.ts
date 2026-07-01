"use client";

import { useEffect, useState, useCallback } from "react";
import { syncOutbox, pendingCount } from "./outbox";

export function useOutbox() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ synced: number; errors: number } | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await pendingCount();
    setPending(count);
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      const result = await syncOutbox();
      setLastSync(result);
      if (result.synced > 0) await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, refreshCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount();


    function handleOnline() {
      setIsOnline(true);
      void sync();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCount, sync]);

  return { isOnline, pending, isSyncing, lastSync, sync, refreshCount };
}
