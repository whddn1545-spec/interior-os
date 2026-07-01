"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, CheckCircleIcon, Loader2Icon, MessageSquareIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { createAsRequest, updateAsStatus, generateInspectionMessage } from "./actions";

type AsRequest = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "closed";
  warranty_type: "repair" | "inspection" | "complaint";
  created_at: string;
};

interface Props {
  siteId: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  siteName: string;
  endDate: string | null;
  businessName: string;
  initialRequests: AsRequest[];
}

const TYPE_LABEL: Record<string, string> = {
  repair: "수리", inspection: "점검", complaint: "민원",
};
const TYPE_COLOR: Record<string, string> = {
  repair: "bg-warning/15 text-warning-foreground",
  inspection: "bg-info/12 text-info",
  complaint: "bg-loss/12 text-loss",
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:        { label: "접수됨",   color: "text-warning",  icon: <ClockIcon size={14} /> },
  in_progress: { label: "처리중",   color: "text-info",     icon: <Loader2Icon size={14} /> },
  closed:      { label: "처리완료", color: "text-profit",   icon: <CheckCircleIcon size={14} /> },
};

export function WarrantyClient({
  siteId, customerName, customerPhone, siteName, endDate, businessName, initialRequests,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requests, setRequests] = useState<AsRequest[]>(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<"repair" | "inspection" | "complaint">("repair");
  const [formError, setFormError] = useState("");

  // 점검 문자 생성
  const [msgLoading, setMsgLoading] = useState(false);
  const [inspectionMsg, setInspectionMsg] = useState<string | null>(null);
  const [msgCopied, setMsgCopied] = useState(false);

  const openCount = requests.filter((r) => r.status !== "closed").length;

  function handleSubmit() {
    if (!title.trim()) { setFormError("제목을 입력해주세요"); return; }
    setFormError("");
    startTransition(async () => {
      const res = await createAsRequest(siteId, { title, description: desc, warrantyType: type });
      if (res.ok) {
        setTitle(""); setDesc(""); setType("repair"); setShowForm(false);
        router.refresh();
      } else {
        setFormError(res.error ?? "저장 실패");
      }
    });
  }

  function handleStatus(id: string, status: "open" | "in_progress" | "closed") {
    startTransition(async () => {
      await updateAsStatus(id, siteId, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    });
  }

  async function handleGenMsg() {
    setMsgLoading(true); setInspectionMsg(null); setMsgCopied(false);
    const res = await generateInspectionMessage(siteId, customerName ?? "고객", siteName, endDate, businessName);
    setMsgLoading(false);
    if (res.ok) setInspectionMsg(res.message ?? "");
  }

  async function copyMsg() {
    if (!inspectionMsg) return;
    await navigator.clipboard.writeText(inspectionMsg);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* 점검 문자 발송 */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="text-base font-bold text-foreground mb-1">무상 점검 안내 문자</h3>
        <p className="text-sm text-muted-foreground mb-3">GPT-4o가 고객 맞춤 점검 안내 문자를 작성해드려요</p>

        {inspectionMsg ? (
          <div className="space-y-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-base text-foreground whitespace-pre-line leading-relaxed">{inspectionMsg}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyMsg}
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-base font-bold active:bg-primary/90"
              >
                {msgCopied ? "복사됨 ✓" : "문자 내용 복사"}
              </button>
              {customerPhone && (
                <a
                  href={`sms:${customerPhone}?body=${encodeURIComponent(inspectionMsg)}`}
                  className="flex-1 h-12 rounded-xl bg-profit/15 text-profit text-base font-bold flex items-center justify-center gap-1"
                >
                  <MessageSquareIcon size={16} />
                  문자 앱으로
                </a>
              )}
              <button
                onClick={() => setInspectionMsg(null)}
                className="h-12 w-12 rounded-xl border border-border text-muted-foreground flex items-center justify-center"
              >
                <XCircleIcon size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenMsg}
            disabled={msgLoading}
            className="w-full h-12 rounded-xl bg-info/12 text-info text-base font-semibold flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-60"
          >
            {msgLoading ? <Loader2Icon size={16} className="animate-spin" /> : <MessageSquareIcon size={16} />}
            {msgLoading ? "작성 중..." : "점검 안내 문자 만들기"}
          </button>
        )}
      </div>

      {/* A/S 목록 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">A/S 접수 목록</h3>
          {openCount > 0 && (
            <p className="text-sm text-warning font-semibold">{openCount}건 처리 중</p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-base font-bold active:bg-primary/90"
        >
          <PlusIcon size={18} />
          접수하기
        </button>
      </div>

      {/* 접수 폼 */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">유형</label>
            <div className="grid grid-cols-3 gap-2">
              {(["repair", "inspection", "complaint"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`h-11 rounded-xl text-base font-bold transition-colors ${
                    type === t ? "bg-primary text-primary-foreground" : "bg-muted text-foreground active:bg-accent"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 욕실 타일 들뜸"
              maxLength={100}
              className="w-full h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">상세 내용</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="고객이 설명한 내용을 적어두세요"
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          {formError && <p className="text-sm text-loss font-medium">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="flex-1 h-12 rounded-xl border border-border text-foreground text-base font-semibold active:bg-muted"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground text-base font-bold active:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2Icon size={16} className="animate-spin" /> : null}
              저장
            </button>
          </div>
        </div>
      )}

      {/* A/S 항목 목록 */}
      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-lg text-muted-foreground mb-1">접수된 A/S가 없어요</p>
          <p className="text-sm text-muted-foreground">고객 문의가 오면 바로 접수해두세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const sc = STATUS_CONFIG[req.status];
            return (
              <div key={req.id} className={`bg-card rounded-2xl border p-4 ${req.status === "closed" ? "border-border opacity-70" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_COLOR[req.warranty_type]}`}>
                      {TYPE_LABEL[req.warranty_type]}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${sc.color}`}>
                      {sc.icon}
                      {sc.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(req.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-base font-semibold text-foreground mb-1">{req.title}</p>
                {req.description && (
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{req.description}</p>
                )}
                {req.status !== "closed" && (
                  <div className="flex gap-2">
                    {req.status === "open" && (
                      <button
                        onClick={() => handleStatus(req.id, "in_progress")}
                        disabled={isPending}
                        className="flex-1 h-10 rounded-xl bg-info/12 text-info text-sm font-bold active:opacity-80 disabled:opacity-50"
                      >
                        처리 시작
                      </button>
                    )}
                    <button
                      onClick={() => handleStatus(req.id, "closed")}
                      disabled={isPending}
                      className="flex-1 h-10 rounded-xl bg-profit/12 text-profit text-sm font-bold active:opacity-80 disabled:opacity-50"
                    >
                      처리 완료
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
