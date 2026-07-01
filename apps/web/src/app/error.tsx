"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 실서비스에서는 여기에 Sentry 등의 에러 트래킹 코드가 들어갑니다.
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mb-8">
        <AlertTriangleIcon size={40} className="text-destructive" />
      </div>
      
      <h1 className="text-3xl font-black text-foreground mb-4">앗, 오류가 발생했어요!</h1>
      <p className="text-lg text-muted-foreground mb-12 max-w-sm">
        네트워크가 불안정하거나 서버에 문제가 생긴 것 같아요. 다시 시도해주시겠어요?
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-2xl py-5 text-xl font-bold active:scale-[0.98] transition-transform shadow-primary-glow"
        >
          <RefreshCwIcon size={24} />
          다시 시도하기
        </button>
        
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full bg-card border border-border text-foreground rounded-2xl py-5 text-xl font-bold active:bg-muted transition-colors"
        >
          <HomeIcon size={24} />
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
