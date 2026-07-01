"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, XIcon } from "lucide-react";
import { acceptQuote } from "./actions";
import { formatKRW } from "@interior-os/core/pricing";

interface Props {
  quoteId: string;
  totalAmount: number;
  siteName: string;
  isAlreadyAccepted: boolean;
}

export function AcceptButton({ quoteId, totalAmount, siteName, isAlreadyAccepted }: Props) {
  const [state, setState] = useState<"idle" | "confirming" | "done" | "error">(
    isAlreadyAccepted ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await acceptQuote(quoteId);
      if (result.alreadyAccepted || result.ok) {
        setState("done");
      } else {
        setState("error");
        setErrorMsg(result.error ?? "오류가 발생했어요. 다시 시도해주세요.");
      }
    });
  }

  if (state === "done") {
    return (
      <div className="bg-profit/10 border border-profit/30 rounded-2xl p-5 text-center">
        <CheckCircle2Icon className="mx-auto mb-2 text-profit" size={40} />
        <p className="text-xl font-black text-profit">견적 수락 완료!</p>
        <p className="text-base text-muted-foreground mt-1">
          시공사에게 수락 내용이 전달됐어요. 곧 연락드릴게요.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 수락 CTA 버튼 */}
      {state === "idle" && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-base font-semibold text-foreground mb-1">이 견적으로 진행하시겠어요?</p>
          <p className="text-sm text-muted-foreground mb-4">
            버튼을 누르시면 시공사에게 수락 의사가 즉시 전달돼요
          </p>
          <button
            onClick={() => setState("confirming")}
            className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-black active:bg-primary/90"
          >
            ✅ 이 견적으로 진행하겠습니다
          </button>
        </div>
      )}

      {/* 확인 바텀시트 */}
      {state === "confirming" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10">
            <button
              onClick={() => setState("idle")}
              className="absolute top-4 right-4 p-2 text-muted-foreground"
            >
              <XIcon size={24} />
            </button>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">수락할 견적</p>
              <h3 className="text-2xl font-black text-foreground">{siteName}</h3>
              <p className="text-3xl font-black text-primary mt-2 tabular-nums">
                {formatKRW(totalAmount)}
              </p>
              <p className="text-base text-muted-foreground mt-2">부가세 별도</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={isPending}
                className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-black disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "네, 이 금액으로 진행합니다"}
              </button>
              <button
                onClick={() => setState("idle")}
                disabled={isPending}
                className="w-full bg-muted text-foreground/90 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
              >
                다시 검토할게요
              </button>
            </div>
            {errorMsg && (
              <p className="mt-3 text-center text-base text-loss">{errorMsg}</p>
            )}
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="bg-red-50 border border-loss/30 rounded-2xl p-4 text-center">
          <p className="text-base text-loss font-semibold">{errorMsg}</p>
          <button
            onClick={() => setState("idle")}
            className="mt-3 text-base text-primary underline"
          >
            다시 시도하기
          </button>
        </div>
      )}
    </>
  );
}
