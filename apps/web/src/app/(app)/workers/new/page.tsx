"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import { createWorker } from "./actions";

const TRADE_OPTIONS = [
  { code: "demolition", label: "철거" },
  { code: "electric", label: "전기" },
  { code: "plumbing", label: "배관" },
  { code: "carpentry", label: "목공" },
  { code: "tile", label: "타일" },
  { code: "flooring", label: "바닥" },
  { code: "wallpaper", label: "도배" },
  { code: "paint", label: "도장" },
  { code: "furniture", label: "가구" },
  { code: "light", label: "조명" },
  { code: "curtain", label: "커튼" },
  { code: "cleanup", label: "입주청소" },
];

export default function WorkerNewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allowNoTrade, setAllowNoTrade] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  function toggleTrade(code: string) {
    setAllowNoTrade(false);
    setError(null);
    setSelectedTrades((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleSubmit() {
    if (!name.trim()) { setError("이름을 입력해주세요"); return; }

    const phoneDigits = phone.replace(/\D/g, "");
    if (!phoneDigits) { setError("연락처를 입력해주세요"); return; }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("전화번호를 정확히 입력해주세요 (예: 010-1234-5678)");
      return;
    }

    // 담당 공종 0개는 차단하지 않고 안내만 — 확인 후 한 번 더 누르면 진행
    if (selectedTrades.length === 0 && !allowNoTrade) {
      setError("담당 공종을 1개 이상 선택하세요. 그래도 추가하려면 한 번 더 눌러주세요.");
      setAllowNoTrade(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createWorker({ name, phone, company, tradeCodes: selectedTrades });
      if (!result.ok) {
        setError(result.error ?? "오류가 발생했습니다");
      } else {
        toast.success("작업자를 추가했어요");
        router.push("/workers");
      }
    });
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workers" className="p-3 -ml-3 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">작업자 추가</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">이름 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">연락처 *</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => { setError(null); setPhone(formatPhone(e.target.value)); }}
            placeholder="010-0000-0000"
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
          />
          <p className="mt-1.5 text-base text-gray-500">숫자만 입력하면 자동으로 010-0000-0000 형태로 정리돼요</p>
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">업체명 (선택)</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="홍길동 타일"
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-1">담당 공종</label>
          <p className="text-base text-gray-500 mb-3">
            {selectedTrades.length > 0
              ? `${selectedTrades.length}개 선택됨`
              : "1개 이상 선택해주세요"}
          </p>
          <div className="flex flex-wrap gap-2">
            {TRADE_OPTIONS.map((t) => (
              <button
                key={t.code}
                onClick={() => toggleTrade(t.code)}
                className={`px-5 py-4 rounded-full border-2 text-base font-medium transition-colors ${
                  selectedTrades.includes(t.code)
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "작업자 추가"}
        </button>
      </div>
    </div>
  );
}
