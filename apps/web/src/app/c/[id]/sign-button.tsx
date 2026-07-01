"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, PenLineIcon, XIcon } from "lucide-react";
import { signContract } from "./actions";

interface Props {
  contractId: string;
  siteName: string;
  totalAmount: number;
  customerName: string;
  isAlreadySigned: boolean;
}

type State = "idle" | "confirming" | "done" | "error";

export function SignButton({ contractId, siteName, totalAmount, customerName, isAlreadySigned }: Props) {
  const [state, setState] = useState<State>(isAlreadySigned ? "done" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSign() {
    startTransition(async () => {
      const res = await signContract(contractId);
      if (res.ok) {
        setState("done");
      } else {
        setErrorMsg(res.error ?? "서명 처리 중 오류가 발생했어요");
        setState("error");
      }
    });
  }

  const formatted = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(totalAmount);

  if (state === "done") {
    return (
      <div className="bg-green-50 border-2 border-profit rounded-2xl p-6 text-center">
        <CheckCircleIcon size={40} className="text-profit mx-auto mb-3" />
        <p className="text-xl font-black text-profit">서명이 완료되었어요</p>
        <p className="text-sm text-muted-foreground mt-2">
          {siteName} 계약이 체결되었습니다.<br />
          담당자가 곧 연락드릴 거예요.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-loss/30 rounded-2xl p-4 text-center">
          <p className="text-base font-semibold text-loss">{errorMsg}</p>
        </div>
        <button
          onClick={() => { setState("idle"); setErrorMsg(null); }}
          className="w-full bg-muted text-foreground/90 rounded-2xl py-4 text-lg font-medium"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setState("confirming")}
        className="flex items-center justify-center gap-2 w-full bg-profit text-white rounded-2xl py-5 text-xl font-bold active:bg-green-700"
      >
        <PenLineIcon size={22} />
        이 계약에 서명하기
      </button>

      {state === "confirming" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-foreground">계약 서명 확인</h3>
              <button onClick={() => setState("idle")} className="p-2 text-muted-foreground">
                <XIcon size={24} />
              </button>
            </div>

            <div className="bg-muted rounded-2xl p-4 space-y-3 mb-6">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">고객명</span>
                <span className="font-semibold text-foreground">{customerName}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">현장</span>
                <span className="font-semibold text-foreground">{siteName}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">계약 금액</span>
                <span className="font-black text-primary/90">{formatted}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center mb-5">
              위 내용을 확인하고 인테리어 공사 계약에 동의합니다
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSign}
                disabled={isPending}
                className="w-full bg-profit text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 active:bg-green-700"
              >
                {isPending ? "서명 처리 중..." : "✅ 서명 완료"}
              </button>
              <button
                onClick={() => setState("idle")}
                className="w-full bg-muted text-foreground/90 rounded-2xl py-4 text-lg font-medium"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
