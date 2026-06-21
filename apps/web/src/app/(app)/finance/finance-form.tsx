"use client";

import { useState, useTransition } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { addFinanceEntry } from "./actions";

interface Site { id: string; name: string }

export function FinanceForm({ sites }: { sites: Site[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setError(null);
      const result = await addFinanceEntry(formData);
      if (result.ok) {
        setOpen(false);
        form.reset();
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-base font-semibold"
      >
        <PlusIcon size={18} />
        입출금 추가
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">입출금 추가</h2>
              <button onClick={() => setOpen(false)} className="p-2 text-gray-400">
                <XIcon size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 수입/지출 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">종류</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "in", label: "수입", color: "text-green-700 border-green-400 bg-green-50" },
                    { value: "out", label: "지출", color: "text-red-600 border-red-400 bg-red-50" },
                  ].map(({ value, label, color }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="direction"
                        value={value}
                        defaultChecked={value === "in"}
                        className="sr-only peer"
                        required
                      />
                      <span className={`flex-1 text-center py-3 rounded-xl border-2 text-lg font-bold peer-checked:ring-2 peer-checked:ring-offset-1 ${color}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">항목</label>
                <select
                  name="category"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
                >
                  <option value="customer_payment">고객 입금</option>
                  <option value="material">자재비</option>
                  <option value="labor">인건비</option>
                  <option value="outsourcing">외주비</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              {/* 금액 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">금액 (원)</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min={1}
                  placeholder="예) 1500000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
                />
              </div>

              {/* 날짜 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">날짜</label>
                <input
                  type="date"
                  name="paid_at"
                  required
                  defaultValue={today}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
                />
              </div>

              {/* 현장 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">현장 (선택)</label>
                <select
                  name="site_id"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
                >
                  <option value="">현장 선택 안 함</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">메모 (선택)</label>
                <input
                  type="text"
                  name="memo"
                  placeholder="거래처명, 내용 등"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
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
                className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold disabled:opacity-50"
              >
                {isPending ? "저장 중..." : "저장하기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
