"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorker, deactivateWorker } from "./actions";
import { formatPhone } from "@/lib/utils";

const ALL_TRADES = [
  { code: "wallpaper", label: "도배" },
  { code: "flooring", label: "바닥재" },
  { code: "tile", label: "타일" },
  { code: "paint", label: "페인트" },
  { code: "carpentry", label: "목공" },
  { code: "electric", label: "전기" },
  { code: "plumbing", label: "설비" },
  { code: "film", label: "필름" },
  { code: "demolition", label: "철거" },
  { code: "bathroom", label: "욕실" },
  { code: "kitchen", label: "주방" },
  { code: "window", label: "창호" },
];

interface Worker {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  rating: number | null;
  memo: string | null;
  tradeCodes: string[];
}

export function WorkerEditForm({ worker }: { worker: Worker }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeactivating, startDeactivating] = useTransition();
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(worker.rating ?? 0);
  const [phone, setPhone] = useState(worker.phone);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("rating", String(rating));

    startTransition(async () => {
      setError(null);
      const result = await updateWorker(worker.id, formData);
      if (result.ok) {
        router.push("/workers");
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  function handleDeactivate() {
    setShowDeactivateConfirm(true);
  }

  function confirmDeactivate() {
    setShowDeactivateConfirm(false);
    startDeactivating(async () => {
      await deactivateWorker(worker.id);
      router.push("/workers");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">이름 *</label>
        <input
          name="name"
          required
          defaultValue={worker.name}
          className="w-full border border-border rounded-xl px-4 py-3 text-base"
        />
      </div>

      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">전화번호 *</label>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          required
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="w-full border border-border rounded-xl px-4 py-3 text-base"
        />
      </div>

      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">업체명 (선택)</label>
        <input
          name="company"
          defaultValue={worker.company ?? ""}
          className="w-full border border-border rounded-xl px-4 py-3 text-base"
        />
      </div>

      {/* 평점 */}
      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">평점</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors active:opacity-70 ${
                rating === v ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {v === 0 ? "없음" : "★".repeat(v)}
            </button>
          ))}
        </div>
      </div>

      {/* 담당 공종 */}
      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">담당 공종</label>
        <div className="grid grid-cols-3 gap-2">
          {ALL_TRADES.map(({ code, label }) => {
            const checked = worker.tradeCodes.includes(code);
            return (
              <label key={code} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="trade_codes"
                  value={code}
                  defaultChecked={checked}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-base text-foreground/90">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-base font-semibold text-foreground/90 mb-2">메모 / 이력</label>
        <textarea
          name="memo"
          defaultValue={worker.memo ?? ""}
          rows={3}
          placeholder="작업 특이사항, 이력 등"
          className="w-full border border-border rounded-xl px-4 py-3 text-base resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장하기"}
      </button>

      {showDeactivateConfirm ? (
        <div className="bg-red-50 border border-loss/30 rounded-2xl p-4">
          <p className="text-base font-semibold text-red-900 mb-1">작업자를 숨길까요?</p>
          <p className="text-sm text-loss mb-3">목록에서 사라지며 복구할 수 없어요.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowDeactivateConfirm(false)} className="flex-1 py-3 rounded-xl border border-border text-foreground/90 text-base font-medium">아니요</button>
            <button type="button" onClick={confirmDeactivate} disabled={isDeactivating} className="flex-1 py-3 rounded-xl bg-loss text-white text-base font-bold disabled:opacity-50">네, 숨기기</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={isDeactivating}
          className="w-full py-3 border-2 border-red-300 text-loss rounded-xl text-base font-semibold disabled:opacity-50"
        >
          {isDeactivating ? "처리 중..." : "작업자 숨기기"}
        </button>
      )}
    </form>
  );
}
