"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, CircleIcon, SendIcon } from "lucide-react";
import { toggleChecklistItem } from "./checklist/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const PHASES = [
  { key: "demolition", label: "철거", emoji: "🔨", desc: "기존 마감재·벽체 철거" },
  { key: "electrical", label: "전기", emoji: "⚡", desc: "전기 배선·콘센트·조명 배선" },
  { key: "plumbing",   label: "설비·배관", emoji: "🔧", desc: "수도·난방·환기 배관" },
  { key: "window",     label: "창호", emoji: "🪟", desc: "창문·문틀·도어 교체" },
  { key: "tile",       label: "타일", emoji: "🟧", desc: "욕실·주방 타일 시공" },
  { key: "floor",      label: "바닥재", emoji: "🟫", desc: "마루·강마루·장판 시공" },
  { key: "wallpaper",  label: "도배·페인트", emoji: "🖌️", desc: "벽지·도장 마감" },
  { key: "lighting",   label: "조명·스위치", emoji: "💡", desc: "조명기구·스위치·콘센트 마감" },
  { key: "furniture",  label: "가구·주방", emoji: "🪑", desc: "붙박이장·주방가구 설치" },
  { key: "cleaning",   label: "입주 청소", emoji: "🧹", desc: "입주 청소 완료" },
  { key: "inspection", label: "최종 점검", emoji: "✅", desc: "고객과 함께 하자 점검" },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];

interface Props {
  siteId: string;
  siteName: string;
  customerName: string | null;
  doneKeys: PhaseKey[];
}

export function ChecklistTab({ siteId, siteName, customerName, doneKeys: initialDoneKeys }: Props) {
  const router = useRouter();
  const [doneKeys, setDoneKeys] = useState<Set<PhaseKey>>(new Set(initialDoneKeys));
  const [pending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const doneCount = doneKeys.size;
  const total = PHASES.length;
  const pct = Math.round((doneCount / total) * 100);

  function handleToggle(key: PhaseKey) {
    const nowDone = !doneKeys.has(key);
    setLoadingKey(key);

    // 낙관적 업데이트
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(key);
      else next.delete(key);
      return next;
    });

    startTransition(async () => {
      const result = await toggleChecklistItem(siteId, key, nowDone);
      setLoadingKey(null);
      if (!result.ok) {
        // 롤백
        setDoneKeys((prev) => {
          const next = new Set(prev);
          if (nowDone) next.delete(key);
          else next.add(key);
          return next;
        });
        toast.error(result.error ?? "저장에 실패했어요");
      } else {
        if (nowDone && doneCount + 1 === total) {
          toast.success("🎉 모든 공정이 완료됐어요!");
        }
        router.refresh();
      }
    });
  }

  function buildProgressMessage(): string {
    const doneLabels = PHASES.filter((p) => doneKeys.has(p.key)).map((p) => p.label);
    const remainLabels = PHASES.filter((p) => !doneKeys.has(p.key)).map((p) => p.label);
    const lines = [
      `${customerName ? `${customerName}님 안녕하세요! ` : ""}${siteName} 공사 진행 상황 안내드립니다.`,
      "",
      `📊 전체 진행률: ${pct}% (${doneCount}/${total}단계)`,
      "",
    ];
    if (doneLabels.length > 0) lines.push(`✅ 완료: ${doneLabels.join(", ")}`);
    if (remainLabels.length > 0) lines.push(`🔄 예정: ${remainLabels.join(", ")}`);
    lines.push("", "궁금하신 점 있으시면 언제든지 연락 주세요! 😊");
    return lines.join("\n");
  }

  function handleShare() {
    const msg = buildProgressMessage();
    if (navigator.share) {
      navigator.share({ title: `${siteName} 공사 현황`, text: msg }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("진행 상황 문자가 복사됐어요", { description: "카카오톡·문자앱에 붙여넣기 하세요" });
    }
  }

  return (
    <div className="space-y-5">
      {/* 진행률 헤더 */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">공정 진행률</h2>
          <span
            className={`text-base font-black tabular-nums px-3 py-1 rounded-full ${
              pct === 100
                ? "bg-profit/15 text-profit"
                : pct >= 60
                  ? "bg-primary/10 text-primary/90"
                  : "bg-muted text-foreground/80"
            }`}
          >
            {pct}%
          </span>
        </div>
        {/* 진행 바 */}
        <div className="h-4 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-profit" : "bg-primary/90"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {doneCount}/{total}단계 완료
          {pct === 100 ? " · 모든 공정 완료! 🎉" : ""}
        </p>
      </div>

      {/* 공정 목록 */}
      <div className="space-y-2">
        {PHASES.map((phase, idx) => {
          const isDone = doneKeys.has(phase.key);
          const isLoading = loadingKey === phase.key;
          return (
            <button
              key={phase.key}
              onClick={() => handleToggle(phase.key)}
              disabled={pending || isLoading}
              className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 border text-left transition-colors active:scale-[0.99] ${
                isDone
                  ? "bg-profit/8 border-profit/25"
                  : "bg-card border-border"
              }`}
            >
              {/* 번호 + 아이콘 */}
              <div className="relative shrink-0">
                {isDone ? (
                  <CheckCircle2Icon size={28} className="text-profit" />
                ) : (
                  <CircleIcon size={28} className="text-muted-foreground/40" />
                )}
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-muted-foreground/60 bg-background rounded-full w-4 h-4 flex items-center justify-center border border-border">
                  {idx + 1}
                </span>
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{phase.emoji}</span>
                  <p className={`text-base font-bold ${isDone ? "text-profit" : "text-foreground"}`}>
                    {phase.label}
                  </p>
                  {isLoading && (
                    <span className="text-xs text-muted-foreground animate-pulse">저장중...</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{phase.desc}</p>
              </div>

              {/* 완료 텍스트 */}
              {isDone && (
                <span className="text-sm font-semibold text-profit shrink-0">완료</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 고객 공유 CTA */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-base font-semibold text-foreground mb-1">진행 상황 공유하기</p>
        <p className="text-sm text-muted-foreground mb-4">
          완료된 단계를 바탕으로 고객 안내 문자를 자동으로 만들어드려요
        </p>
        <button
          onClick={handleShare}
          disabled={doneCount === 0}
          className="flex items-center justify-center gap-2 w-full bg-primary text-white rounded-2xl py-4 text-base font-bold disabled:opacity-40"
        >
          <SendIcon size={18} />
          {doneCount === 0 ? "먼저 완료된 공정을 체크해주세요" : "고객 안내 문자 복사하기"}
        </button>
      </div>
    </div>
  );
}
