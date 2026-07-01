"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteFinanceEntry } from "./actions";

interface Props {
  id: string;
  direction: "in" | "out";
  category: string;
  amount: number;
  paidAt: string;
  siteName: string | null;
  memo: string | null;
  categoryLabel: string;
}

export function FinanceEntryItem({ id, direction, amount, paidAt, siteName, memo, categoryLabel }: Props) {
  const isIn = direction === "in";
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteFinanceEntry(id);
      setConfirmDelete(false);
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isIn ? "bg-green-100 text-profit" : "bg-red-100 text-loss"}`}>
              {isIn ? "수입" : "지출"}
            </span>
            <p className="text-base font-semibold text-foreground truncate">{categoryLabel}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {paidAt}{siteName ? ` · ${siteName}` : ""}
          </p>
          {memo && <p className="text-sm text-muted-foreground/70">{memo}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className={`text-xl font-bold ${isIn ? "text-profit" : "text-red-500"}`}>
            {isIn ? "+" : "-"}{amount.toLocaleString("ko-KR")}원
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-3 -mr-1 text-muted-foreground/50 active:text-red-400"
            aria-label="삭제"
          >
            <Trash2Icon size={20} />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 bg-red-50 border border-loss/30 rounded-xl p-3">
          <p className="text-base font-semibold text-loss mb-2">이 내역을 삭제할까요?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 bg-loss text-white py-2.5 rounded-xl text-base font-semibold disabled:opacity-50 active:bg-loss"
            >
              {isPending ? "삭제 중..." : "삭제"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-border text-foreground/90 py-2.5 rounded-xl text-base font-semibold active:bg-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
