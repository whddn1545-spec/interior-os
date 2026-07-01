"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, SparklesIcon, ZapIcon } from "lucide-react";

const FREE_FEATURES = [
  "견적서 월 5건",
  "고객 20명",
  "현장 20개",
  "PDF 출력",
  "일정 관리",
];

const PRO_FEATURES = [
  "견적·고객·현장 무제한",
  "AI 통화 녹음 상담 문서화 무제한",
  "AI 완공 리포트 자동 생성",
  "AI 점검 안내 문자 작성",
  "AI 견적서 생성 무제한",
  "사진 관리 무제한",
  "무드보드 AI 시각화 무제한",
  "인스타그램 마케팅 AI",
];

function PricingContent() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const e = searchParams.get("error");
    if (e === "canceled") setError("결제가 취소되었어요. 다시 시도해주세요.");
    else if (e) setError(decodeURIComponent(e));
  }, [searchParams]);

  function handleSubscribe() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: "pro" }),
        });

        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? "결제 초기화 실패");
        }

        const { clientKey, orderId, amount, orderName } = await res.json() as {
          clientKey: string; orderId: string; amount: number; orderName: string;
        };

        await new Promise<void>((resolve, reject) => {
          if (document.getElementById("tosspay-sdk")) { resolve(); return; }
          const s = document.createElement("script");
          s.id = "tosspay-sdk";
          s.src = "https://js.tosspayments.com/v2/standard";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("결제 모듈 로드 실패"));
          document.head.appendChild(s);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const TossPayments = (window as any).TossPayments;
        if (!TossPayments) throw new Error("결제 모듈을 불러오지 못했어요");

        const tossPayments = await TossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey: "anonymous" });

        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: amount },
          orderId,
          orderName,
          successUrl: `${window.location.origin}/api/payments/success`,
          failUrl: `${window.location.origin}/pricing?error=canceled`,
        });
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground">요금제</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-5">
        {/* 히어로 */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            <SparklesIcon size={14} />
            AI 기능 무제한
          </div>
          <h2 className="text-[28px] font-black text-foreground leading-tight">
            현장에서 바로 쓰는<br />인테리어 AI 도구
          </h2>
          <p className="text-base text-muted-foreground mt-2">부가세 포함 · 언제든 해지 가능</p>
        </div>

        {error && (
          <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
            {error}
          </div>
        )}

        {/* Free 플랜 */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-foreground">무료</h3>
              <p className="text-sm text-muted-foreground">시작해보기</p>
            </div>
            <p className="text-2xl font-black text-foreground">₩0</p>
          </div>
          <ul className="space-y-2.5 mb-5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-base text-foreground/80">
                <CheckIcon size={16} className="text-muted-foreground shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="w-full py-3 text-center border border-border rounded-xl text-base font-semibold text-muted-foreground">
            현재 플랜
          </div>
        </div>

        {/* Pro 플랜 */}
        <div className="bg-card rounded-2xl border-2 border-primary p-5 relative">
          <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <ZapIcon size={12} />
            가장 인기
          </span>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-foreground">Pro</h3>
              <p className="text-sm text-muted-foreground">1인 인테리어 사업자</p>
            </div>
            <div className="text-right">
              <p className="text-[28px] font-black text-foreground leading-none">₩39,000</p>
              <p className="text-sm text-muted-foreground">/월</p>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-base text-foreground">
                <CheckIcon size={16} className="text-profit shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSubscribe}
            disabled={isPending}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground text-lg font-bold disabled:opacity-60 flex items-center justify-center gap-2 active:bg-primary/90"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                결제 창 열기 중...
              </span>
            ) : (
              <>
                <SparklesIcon size={18} />
                Pro 시작하기
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            카드 결제 · 언제든 해지 · 환불 3일 이내
          </p>
        </div>

        {/* 팀 플랜 CTA */}
        <div className="bg-muted rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-foreground">팀·업체용 Team 플랜</p>
            <p className="text-sm text-muted-foreground">팀원 5명 · SMS 무제한 · ₩79,000/월</p>
          </div>
          <Link href="/help" className="text-primary text-sm font-semibold shrink-0">
            문의하기 →
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground/60 pb-4">
          결제 문의: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@interior-os.com"}
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingContent />
    </Suspense>
  );
}
