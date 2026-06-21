"use client";

import { useTransition } from "react";
import { updateSiteStatus } from "./actions";
import { useRouter } from "next/navigation";

interface Props {
  siteId: string;
  currentStatus: string;
}

const NEXT_STATUS: Record<string, { next: "in_progress" | "done"; label: string; color: string }> = {
  contracted: { next: "in_progress", label: "공사 시작", color: "bg-green-600 text-white" },
  in_progress: { next: "done", label: "공사 완료", color: "bg-gray-700 text-white" },
};

export function SiteStatusButton({ siteId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const next = NEXT_STATUS[currentStatus];
  if (!next) return null;

  function handleClick() {
    startTransition(async () => {
      await updateSiteStatus(siteId, next.next);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${next.color}`}
    >
      {isPending ? "변경 중..." : next.label}
    </button>
  );
}
