"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

// from 파라미터(예: ?from=settings)를 읽어 상위 화면으로 돌아갈 경로를 결정한다.
// 설정 메뉴에서 진입했으면 설정으로, 아니면 기본 경로(홈)로 돌아간다.
const FROM_ROUTES: Record<string, string> = {
  settings: "/settings",
  home: "/",
};

function BackLinkInner({ fallbackHref }: { fallbackHref: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const href = (from && FROM_ROUTES[from]) || fallbackHref;
  return (
    <Link
      href={href}
      aria-label="뒤로 가기"
      className="flex h-14 w-14 -ml-2 items-center justify-center text-muted-foreground active:bg-muted rounded-xl"
    >
      <ArrowLeftIcon size={26} />
    </Link>
  );
}

// useSearchParams는 Suspense 경계가 필요하므로 내부에서 감싸 준다.
export function BackLink({ fallbackHref = "/" }: { fallbackHref?: string }) {
  return (
    <Suspense
      fallback={
        <Link
          href={fallbackHref}
          aria-label="뒤로 가기"
          className="flex h-14 w-14 -ml-2 items-center justify-center text-muted-foreground active:bg-muted rounded-xl"
        >
          <ArrowLeftIcon size={26} />
        </Link>
      }
    >
      <BackLinkInner fallbackHref={fallbackHref} />
    </Suspense>
  );
}
