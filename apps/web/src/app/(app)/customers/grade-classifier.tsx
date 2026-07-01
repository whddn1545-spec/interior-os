"use client";

import { useState, useTransition } from "react";
import { SparklesIcon, CheckIcon, XIcon } from "lucide-react";
import { aiClassifyGrades, applyGradeChanges } from "./grade-actions";
import type { CustomerGradeResult } from "@/lib/ai/prompts/crm";

const GRADE_LABEL: Record<string, string> = { vip: "VIP", gold: "골드", normal: "일반", dormant: "휴면" };
const GRADE_COLOR: Record<string, string> = {
  vip: "bg-yellow-100 text-yellow-700 border-yellow-300",
  gold: "bg-amber-100 text-amber-700 border-amber-300",
  normal: "bg-gray-100 text-gray-600 border-gray-300",
  dormant: "bg-slate-100 text-slate-500 border-slate-300",
};

export function GradeClassifier() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApplying, startApplying] = useTransition();
  const [results, setResults] = useState<CustomerGradeResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClassify() {
    startTransition(async () => {
      setError(null);
      setResults([]);
      setDone(false);
      const result = await aiClassifyGrades();
      if (result.ok && result.results) {
        setResults(result.results);
        setSelected(new Set(result.results.map((r) => r.customerId)));
      } else {
        setError(result.error ?? "분류 실패");
      }
    });
  }

  function handleApply() {
    const changes = results
      .filter((r) => selected.has(r.customerId))
      .map((r) => ({ customerId: r.customerId, grade: r.recommendedGrade }));

    startApplying(async () => {
      const result = await applyGradeChanges(changes);
      if (result.ok) {
        setDone(true);
        setTimeout(() => setOpen(false), 1500);
      } else {
        setError(result.error ?? "적용 실패");
      }
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResults([]); setDone(false); }}
        className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-2.5 rounded-xl text-base font-semibold"
      >
        <SparklesIcon size={18} />
        AI 등급 추천
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">AI 고객 등급 추천</h2>
              <button onClick={() => setOpen(false)} className="p-3 text-gray-400 active:bg-gray-100 rounded-xl">
                <XIcon size={24} />
              </button>
            </div>

            {results.length === 0 && !done && (
              <>
                <p className="text-base text-gray-600 mb-6">
                  공사 횟수, 매출, 최근 방문일을 분석해서<br/>
                  VIP/골드/일반/휴면 등급을 추천해드려요.
                </p>
                {error && (
                  <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base mb-4">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleClassify}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white rounded-xl text-lg font-bold disabled:opacity-50"
                >
                  <SparklesIcon size={22} />
                  {isPending ? "AI 분석 중... (잠시 기다려주세요)" : "AI로 등급 분류하기"}
                </button>
              </>
            )}

            {results.length > 0 && !done && (
              <>
                <p className="text-base text-gray-600 mb-4">
                  적용할 항목을 선택해서 확정하세요.
                </p>
                <div className="space-y-3 mb-6">
                  {results.map((r) => (
                    <label key={r.customerId} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(r.customerId)}
                        onChange={() => toggleSelect(r.customerId)}
                        className="mt-1 w-5 h-5 accent-purple-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${GRADE_COLOR[r.recommendedGrade] ?? ""}`}>
                            {GRADE_LABEL[r.recommendedGrade] ?? r.recommendedGrade}
                          </span>
                          <span className="text-base font-semibold text-gray-900">추천</span>
                        </div>
                        <p className="text-sm text-gray-500">{r.reason}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {error && (
                  <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base mb-4">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleApply}
                  disabled={isApplying || selected.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl text-lg font-bold disabled:opacity-50"
                >
                  <CheckIcon size={22} />
                  {isApplying ? "적용 중..." : `선택한 ${selected.size}명 등급 확정`}
                </button>
              </>
            )}

            {done && (
              <div className="text-center py-8">
                <CheckIcon size={56} className="mx-auto text-green-500 mb-3" />
                <p className="text-xl font-bold text-gray-900">등급이 업데이트됐어요!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
