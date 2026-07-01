"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon, CheckCircleIcon, PencilIcon } from "lucide-react";
import { updateBusinessInfo } from "./actions";

interface Props {
  businessName: string;
  ownerName: string;
  plan: string;
}

export function BusinessInfoCard({ businessName, ownerName, plan }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const planLabel = plan === "basic" ? "기본 요금제" : plan;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setError(null);
      const result = await updateBusinessInfo(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          setSaved(false);
          setOpen(false);
        }, 1200);
      } else {
        setError(result.error ?? "저장에 실패했어요");
      }
    });
  }

  return (
    <>
      {/* 사업자 정보 카드 (누르면 수정) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left bg-blue-600 rounded-2xl px-4 py-5 mb-6 text-white active:bg-blue-700"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold truncate">{businessName}</p>
            <p className="text-blue-200 mt-0.5">{ownerName} 대표 · {planLabel}</p>
          </div>
          <span className="flex items-center gap-1.5 bg-blue-500/60 rounded-full px-3 py-2 shrink-0">
            <PencilIcon size={16} />
            <span className="text-base font-semibold">정보 수정</span>
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            {saved ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircleIcon size={72} className="text-green-500 mb-4" />
                <p className="text-2xl font-bold text-gray-900">저장됐어요!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">사업자 정보 수정</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-3 text-gray-400 active:bg-gray-100 rounded-xl"
                    aria-label="닫기"
                  >
                    <XIcon size={24} />
                  </button>
                </div>

                <p className="text-base text-gray-500 mb-6">
                  여기서 고친 상호와 대표자명은 견적서·계약서에 그대로 들어가요.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="business_name" className="block text-base font-semibold text-gray-800 mb-2">
                      상호 (업체명)
                    </label>
                    <input
                      id="business_name"
                      name="business_name"
                      type="text"
                      defaultValue={businessName}
                      required
                      placeholder="예) 홍길동인테리어"
                      className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="owner_name" className="block text-base font-semibold text-gray-800 mb-2">
                      대표자 이름
                    </label>
                    <input
                      id="owner_name"
                      name="owner_name"
                      type="text"
                      defaultValue={ownerName}
                      required
                      placeholder="예) 홍길동"
                      className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl text-lg font-bold disabled:opacity-50"
                  >
                    {isPending ? "저장 중..." : "저장하기"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
