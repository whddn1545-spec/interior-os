"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    priceLabel: "무료",
    desc: "처음 시작하는 사업자",
    color: "border-gray-200",
    features: [
      "견적 월 5건",
      "고객 50명",
      "PDF 출력",
      "일정 관리",
      "AI 기능 제한",
    ],
    limits: ["AI 견적서 생성 월 5회", "사진 관리 기본"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29000,
    priceLabel: "29,000원/월",
    desc: "1인 인테리어 사업자",
    color: "border-blue-500",
    badge: "추천",
    features: [
      "견적 무제한",
      "고객 무제한",
      "AI 견적서/계약서 무제한",
      "SMS 월 200건",
      "Vision AI 사진 분류",
      "인스타그램 마케팅",
      "자재 수량 산출",
      "무드보드 월 10회",
    ],
    limits: [],
  },
  {
    id: "team",
    name: "Team",
    price: 69000,
    priceLabel: "69,000원/월",
    desc: "팀·소형 업체",
    color: "border-purple-500",
    features: [
      "Pro 모든 기능",
      "팀원 5명",
      "SMS 무제한",
      "무드보드 무제한",
      "관리자 대시보드",
      "우선 고객 지원",
    ],
    limits: [],
  },
];

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe(planId: string, price: number) {
    if (price === 0) return;
    setSelectedPlan(planId);

    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, price }),
        });

        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? "결제 초기화 실패");
        }

        const { clientKey, orderId, amount, orderName } = await res.json() as {
          clientKey: string; orderId: string; amount: number; orderName: string;
        };

        // 토스페이먼츠 위젯 로드 (동적 import)
        // 토스페이먼츠 SDK CDN 동적 로드
        await new Promise<void>((resolve, reject) => {
          if (document.getElementById("tosspay-sdk")) { resolve(); return; }
          const s = document.createElement("script");
          s.id = "tosspay-sdk";
          s.src = "https://js.tosspayments.com/v2/standard";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("토스페이먼츠 SDK 로드 실패"));
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
        setSelectedPlan(null);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">요금제</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-gray-900 mb-1">InteriorOS 요금제</p>
          <p className="text-base text-gray-500">부가세 포함 · 언제든 해지 가능</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
            {error}
          </div>
        )}

        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border-2 p-5 relative ${plan.color}`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-4 bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                {plan.badge}
              </span>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500">{plan.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">{plan.priceLabel}</p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-base text-gray-700">
                  <CheckIcon size={18} className="text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.price === 0 ? (
              <button
                className="w-full py-3 border-2 border-gray-300 text-gray-600 rounded-xl text-base font-semibold"
                disabled
              >
                현재 무료 플랜
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe(plan.id, plan.price)}
                disabled={isPending && selectedPlan === plan.id}
                className={`w-full py-4 rounded-xl text-base font-bold text-white disabled:opacity-50 ${
                  plan.id === "pro" ? "bg-blue-600" : "bg-purple-600"
                }`}
              >
                {isPending && selectedPlan === plan.id ? "결제 창 열기 중..." : `${plan.priceLabel} 시작하기`}
              </button>
            )}
          </div>
        ))}

        <p className="text-center text-sm text-gray-400 mt-4">
          결제 관련 문의: whddn1545@gmail.com
        </p>
      </div>
    </div>
  );
}
