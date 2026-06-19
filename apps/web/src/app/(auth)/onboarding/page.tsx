"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "lucide-react";

const STEPS = ["사업자 정보", "단가 초기화", "완료"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 0: 사업자 정보
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // Step 1: 단가 선택
  const [useDefaultPrices, setUseDefaultPrices] = useState(true);

  async function handleStep0() {
    if (!businessName.trim() || !ownerName.trim()) {
      setError("상호와 대표자명을 입력해주세요");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, ownerName }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "오류가 발생했습니다");
      } else {
        setError(null);
        setStep(1);
      }
    });
  }

  async function handleStep1() {
    if (useDefaultPrices) {
      startTransition(async () => {
        const res = await fetch("/api/onboarding/seed-prices", { method: "POST" });
        if (!res.ok) {
          // 실패해도 계속 진행
        }
        setStep(2);
      });
    } else {
      setStep(2);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 pt-16 pb-8">
      <div className="max-w-md mx-auto">
        {/* 진행 표시 */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: 사업자 정보 */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">환영합니다! 👋</h1>
            <p className="text-lg text-gray-500 text-center mb-8">
              InteriorOS에 오신 것을 환영해요.<br/>
              먼저 사업자 정보를 입력해주세요.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2">상호 (업체명)</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="예: 홍길동인테리어"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-xl focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2">대표자 이름</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-xl focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">{error}</div>
            )}

            <button
              onClick={handleStep0}
              disabled={isPending}
              className="mt-6 w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "다음 →"}
            </button>
          </div>
        )}

        {/* Step 1: 단가 초기화 */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">단가표 설정</h1>
            <p className="text-lg text-gray-500 text-center mb-8">
              업계 평균 단가로 시작하고 나중에 수정할 수 있어요.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setUseDefaultPrices(true)}
                className={`w-full text-left p-5 rounded-2xl border-2 ${
                  useDefaultPrices ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-xl font-bold text-gray-900">📥 기본 단가 불러오기</p>
                <p className="text-base text-gray-500 mt-1">
                  도배, 바닥재, 타일 등 12개 공종의 업계 평균 단가를 불러와요.<br/>
                  이후 내 사업 단가로 직접 수정할 수 있어요.
                </p>
              </button>

              <button
                onClick={() => setUseDefaultPrices(false)}
                className={`w-full text-left p-5 rounded-2xl border-2 ${
                  !useDefaultPrices ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-xl font-bold text-gray-900">✏️ 직접 입력할게요</p>
                <p className="text-base text-gray-500 mt-1">
                  설정 → 단가표에서 직접 입력할게요.
                </p>
              </button>
            </div>

            <button
              onClick={handleStep1}
              disabled={isPending}
              className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "완료 →"}
            </button>
          </div>
        )}

        {/* Step 2: 완료 */}
        {step === 2 && (
          <div className="text-center">
            <CheckCircleIcon size={80} className="mx-auto text-green-500 mb-6" />
            <h1 className="text-3xl font-black text-gray-900 mb-3">준비 완료! 🎉</h1>
            <p className="text-lg text-gray-500 mb-8">
              이제 InteriorOS를 사용할 수 있어요.<br/>
              첫 견적을 만들어보세요!
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/quotes/new")}
                className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold"
              >
                📄 첫 견적 만들기
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium"
              >
                홈으로 가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
