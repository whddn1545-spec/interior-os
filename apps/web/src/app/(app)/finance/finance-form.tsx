"use client";

import { useState, useTransition } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addFinanceEntry } from "./actions";

interface Site { id: string; name: string }

// 카테고리별로 수입/지출 기본값을 정한다.
// 고객 입금만 수입(in)이고, 나머지(자재비/인건비/외주비/기타)는 모두 지출(out)이다.
function directionForCategory(category: string): "in" | "out" {
  return category === "customer_payment" ? "in" : "out";
}

export function FinanceForm({ sites }: { sites: Site[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [category, setCategory] = useState("customer_payment");
  const [direction, setDirection] = useState<"in" | "out">("in");

  const today = new Date().toISOString().split("T")[0];

  // 항목을 고르면 그에 맞는 수입/지출로 자동 전환한다.
  function handleCategoryChange(next: string) {
    setCategory(next);
    setDirection(directionForCategory(next));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // 클라이언트 사전 검증 — 금액/날짜
    const amount = Number(formData.get("amount"));
    const paidAt = String(formData.get("paid_at") ?? "");
    if (!Number.isFinite(amount) || amount < 1) {
      setError("금액을 1원 이상으로 입력해주세요");
      return;
    }
    if (paidAt && paidAt > today) {
      setError("미래 날짜는 입력할 수 없어요. 날짜를 확인해주세요.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await addFinanceEntry(formData);
      if (result.ok) {
        // 자동으로 닫지 않고 토스트로 알린 뒤 연속 입력 유도
        setAddedCount((c) => c + 1);
        toast.success("저장됐어요! 이어서 입력할 수 있어요.");
        form.reset();
        // 폼 초기화 후 항목/종류 기본값도 함께 되돌린다.
        setCategory("customer_payment");
        setDirection("in");
        const dateInput = form.elements.namedItem("paid_at") as HTMLInputElement | null;
        if (dateInput) dateInput.value = today;
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  function closeSheet() {
    setOpen(false);
    setError(null);
    setAddedCount(0);
    setCategory("customer_payment");
    setDirection("in");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-base font-semibold active:bg-primary/90"
      >
        <PlusIcon size={18} />
        입출금 추가
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">입출금 추가</h2>
              <button onClick={closeSheet} aria-label="닫기" className="flex items-center justify-center w-14 h-14 -mr-2 text-muted-foreground/70">
                <XIcon size={28} />
              </button>
            </div>

            {addedCount > 0 && (
              <div className="bg-profit/10 border border-profit/20 rounded-xl px-4 py-4 mb-4 text-green-800 text-base font-semibold">
                지금까지 {addedCount}건 추가됐어요. 계속 입력하거나 닫기를 눌러주세요.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 카테고리 — 항목을 먼저 고르면 수입/지출이 자동으로 맞춰진다 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">항목</label>
                <select
                  name="category"
                  required
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-card"
                >
                  <option value="customer_payment">고객 입금</option>
                  <option value="material">자재비</option>
                  <option value="labor">인건비</option>
                  <option value="outsourcing">외주비</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              {/* 수입/지출 — 항목에 맞춰 자동 선택되며, 필요하면 직접 바꿀 수 있다 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">종류</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "in", label: "수입", color: "text-profit border-green-400 bg-profit/10" },
                    { value: "out", label: "지출", color: "text-loss border-red-400 bg-red-50" },
                  ].map(({ value, label, color }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="direction"
                        value={value}
                        checked={direction === value}
                        onChange={() => setDirection(value as "in" | "out")}
                        className="sr-only peer"
                        required
                      />
                      <span className={`flex-1 text-center py-3 rounded-xl border-2 text-lg font-bold peer-checked:ring-2 peer-checked:ring-offset-1 ${color}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-base text-muted-foreground">항목에 맞춰 자동으로 골라드려요. 다르면 직접 바꿀 수 있어요.</p>
              </div>

              {/* 금액 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">금액 (원)</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="예) 1500000"
                  className="w-full border border-border rounded-xl px-4 py-3 text-base"
                />
                <p className="mt-1.5 text-base text-muted-foreground">1원 이상, 음수는 입력할 수 없어요</p>
              </div>

              {/* 날짜 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">날짜</label>
                <input
                  type="date"
                  name="paid_at"
                  required
                  max={today}
                  defaultValue={today}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base"
                />
                <p className="mt-1.5 text-base text-muted-foreground">오늘까지만 선택할 수 있어요 (미래 날짜 불가)</p>
              </div>

              {/* 현장 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">현장 (선택)</label>
                <select
                  name="site_id"
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-card"
                >
                  <option value="">현장 선택 안 함</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">메모 (선택)</label>
                <input
                  type="text"
                  name="memo"
                  placeholder="거래처명, 내용 등"
                  className="w-full border border-border rounded-xl px-4 py-3 text-base"
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
                className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold disabled:opacity-50 active:bg-primary/90"
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
