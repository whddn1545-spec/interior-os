"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { createCustomer } from "./actions";

const SOURCE_OPTIONS = [
  { value: "referral", label: "소개" },
  { value: "online", label: "온라인" },
  { value: "repeat", label: "재방문" },
  { value: "etc", label: "기타" },
] as const;

export default function CustomerNewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState<"referral" | "online" | "repeat" | "etc">("referral");
  const [memo, setMemo] = useState("");

  function handleSubmit() {
    if (name.trim().length < 2) { setError("이름을 2자 이상 입력해주세요"); return; }
    if (!phone.trim()) { setError("연락처를 입력해주세요"); return; }

    startTransition(async () => {
      const result = await createCustomer({ name, phone, address, source, memo });
      if (!result.ok) {
        setError(result.error ?? "오류가 발생했습니다");
      } else {
        router.push("/customers");
      }
    });
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">고객 추가</h1>
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">주소 (선택)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울시 강남구 ..."
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-3">유입 경로</label>
          <div className="grid grid-cols-2 gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSource(opt.value)}
                className={`py-3 rounded-2xl border-2 text-base font-medium transition-colors ${
                  source === opt.value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="고객 특이사항, 취향, 예산 등..."
            rows={3}
            className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "고객 추가"}
        </button>
      </div>
    </div>
  );
}
