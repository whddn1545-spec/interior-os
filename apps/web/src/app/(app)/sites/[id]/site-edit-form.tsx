"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, XIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { updateSite } from "./actions";

type SiteStatus = "lead" | "quoting" | "contracted" | "in_progress" | "done" | "canceled";

const STATUS_OPTIONS: { value: SiteStatus; label: string; color: string; active: string }[] = [
  { value: "lead",        label: "상담중",   color: "border-border bg-muted text-muted-foreground",     active: "border-muted-foreground bg-muted-foreground text-background" },
  { value: "quoting",     label: "견적중",   color: "border-border bg-muted text-muted-foreground",     active: "border-info bg-info text-info-foreground" },
  { value: "contracted",  label: "계약완료", color: "border-border bg-muted text-muted-foreground",     active: "border-warning bg-warning text-warning-foreground" },
  { value: "in_progress", label: "공사중",   color: "border-border bg-muted text-muted-foreground",     active: "border-profit bg-profit text-profit-foreground" },
  { value: "done",        label: "완료",     color: "border-border bg-muted text-muted-foreground",     active: "border-primary bg-primary text-primary-foreground" },
  { value: "canceled",    label: "취소",     color: "border-border bg-muted text-muted-foreground",     active: "border-loss bg-loss text-loss-foreground" },
];

interface Props {
  siteId: string;
  initial: {
    name: string;
    address: string;
    status: SiteStatus;
    start_date: string | null;
    end_date: string | null;
    area_pyeong: number | null;
  };
}

export function SiteEditForm({ siteId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SiteStatus>(initial.status);
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [startDate, setStartDate] = useState(initial.start_date ?? "");
  const [endDate, setEndDate] = useState(initial.end_date ?? "");
  const [area, setArea] = useState(initial.area_pyeong ? String(initial.area_pyeong) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) { setError("현장명을 입력해주세요"); return; }
    if (!address.trim()) { setError("주소를 입력해주세요"); return; }
    setError(null);
    startTransition(async () => {
      const res = await updateSite(siteId, {
        name,
        address,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        area_pyeong: area ? Number(area) : null,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "저장 실패");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 bg-muted text-foreground px-3 py-2.5 rounded-xl text-base font-semibold active:bg-accent"
      >
        <PencilIcon size={15} />
        수정
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-5 pb-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">현장 정보 수정</h2>
              <button onClick={() => setOpen(false)} className="p-3 text-muted-foreground active:bg-muted rounded-xl">
                <XIcon size={24} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 상태 — 가장 중요하므로 최상단 */}
              <div>
                <label className="block text-base font-bold text-foreground mb-3">진행 단계</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`py-3 rounded-2xl border-2 text-base font-bold transition-all ${
                        status === opt.value ? opt.active : opt.color
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-foreground mb-2">현장명 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-foreground mb-2">주소 *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">공사 시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-border rounded-2xl px-4 py-3.5 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">공사 완료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-border rounded-2xl px-4 py-3.5 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">면적 (평)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="예: 32"
                  className="w-full border border-border rounded-2xl px-4 py-3.5 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {error && (
                <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3 text-sm font-medium text-loss">
                  {error}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-5 text-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:bg-primary/90"
              >
                {isPending ? <Loader2Icon size={22} className="animate-spin" /> : <CheckIcon size={22} />}
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
