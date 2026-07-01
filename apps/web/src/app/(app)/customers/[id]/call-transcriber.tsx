"use client";

import { useRef, useState, useTransition } from "react";
import { MicIcon, UploadIcon, CheckCircleIcon, XCircleIcon, Loader2Icon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, LockIcon } from "lucide-react";
import { saveConsultationNote, type ConsultationNote } from "./actions";
import { ProGate, ProBadge } from "@/components/pro-gate";

interface TranscriptionResult {
  rawTranscript: string;
  audioDurationSeconds: number | null;
  summary: string;
  requirements: string[];
  actionItems: string[];
  quoteHints: Record<string, string | string[] | undefined>;
}

interface Props {
  customerId: string;
  isPro: boolean;
  monthUsed: number;
  monthLimit: number;
}

type Stage = "idle" | "transcribing" | "done" | "error";

const ACCEPTED = ".m4a,.mp3,.mp4,.wav,.ogg,.webm";

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function CallTranscriber({ customerId, isPro, monthUsed, monthLimit }: Props) {
  const isLimited = !isPro && monthUsed >= monthLimit;
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setStage("transcribing");
    setResult(null);
    setErrorMsg("");
    setSaved(false);

    const fd = new FormData();
    fd.append("audio", file);

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const json = (await res.json()) as TranscriptionResult & { error?: string };
      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? "알 수 없는 오류");
        setStage("error");
        return;
      }
      setResult(json);
      setStage("done");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다");
      setStage("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function handleSave() {
    if (!result) return;
    const note: ConsultationNote = {
      rawTranscript: result.rawTranscript,
      summary: result.summary,
      requirements: result.requirements,
      actionItems: result.actionItems,
      quoteHints: result.quoteHints,
      audioDurationSeconds: result.audioDurationSeconds,
    };
    startTransition(async () => {
      const res = await saveConsultationNote(customerId, note);
      if (res.ok) setSaved(true);
      else setErrorMsg(res.error ?? "저장 실패");
    });
  }

  const hints = result?.quoteHints ?? {};
  const hintEntries = Object.entries(hints).filter(([, v]) => v !== undefined && v !== "");

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
        <MicIcon size={18} className="text-primary shrink-0" />
        <h3 className="text-base font-bold text-foreground">통화 녹음 → AI 상담 문서화</h3>
        {!isPro && <ProBadge />}
      </div>

      <div className="p-4">
        {/* Pro 한도 초과 시 업그레이드 유도 */}
        {isLimited && (
          <ProGate feature="AI 상담 문서화">
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center">
              <LockIcon size={28} className="mx-auto mb-2 text-primary/50" />
              <p className="text-base font-bold text-foreground mb-1">이번 달 {monthLimit}건 모두 사용했어요</p>
              <p className="text-sm text-muted-foreground mb-3">Pro로 업그레이드하면 무제한으로 사용할 수 있어요</p>
              <div className="flex items-center justify-center gap-1.5 text-primary font-bold">
                <SparklesIcon size={15} />
                Pro 업그레이드 보기
              </div>
            </div>
          </ProGate>
        )}

        {/* 업로드 존 */}
        {!isLimited && stage === "idle" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer active:bg-muted transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <UploadIcon size={32} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground mb-1">녹음 파일 업로드</p>
            <p className="text-sm text-muted-foreground">m4a · mp3 · wav · ogg · webm (최대 25MB)</p>
            <p className="text-sm text-muted-foreground mt-1">탭하거나 파일을 여기에 드래그하세요</p>
          </div>
        )}

        {/* 처리 중 */}
        {stage === "transcribing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2Icon size={36} className="animate-spin text-primary" />
            <p className="text-base font-semibold text-foreground">AI가 분석 중이에요...</p>
            <p className="text-sm text-muted-foreground">Whisper로 음성 인식 후 내용을 정리합니다</p>
          </div>
        )}

        {/* 오류 */}
        {stage === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-loss/10 border border-loss/30 rounded-xl p-4">
              <XCircleIcon size={20} className="text-loss shrink-0 mt-0.5" />
              <p className="text-base text-loss">{errorMsg}</p>
            </div>
            <button
              onClick={() => { setStage("idle"); setErrorMsg(""); }}
              className="w-full h-12 rounded-xl border border-border text-base font-semibold text-foreground active:bg-muted"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 결과 */}
        {stage === "done" && result && (
          <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={18} className="text-profit" />
                <span className="text-sm font-semibold text-profit">분석 완료</span>
              </div>
              {result.audioDurationSeconds && (
                <span className="text-sm text-muted-foreground">
                  {formatDuration(result.audioDurationSeconds)} 분량
                </span>
              )}
            </div>

            {/* 요약 */}
            <div className="bg-primary/8 rounded-xl p-4">
              <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1.5">상담 요약</p>
              <p className="text-base text-foreground leading-relaxed">{result.summary}</p>
            </div>

            {/* 요구사항 */}
            {result.requirements.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">고객 요구사항</p>
                <ul className="space-y-1.5">
                  {result.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-foreground">
                      <span className="text-primary font-bold mt-0.5 shrink-0">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 액션 아이템 */}
            {result.actionItems.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">다음 할 일</p>
                <ul className="space-y-1.5">
                  {result.actionItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-foreground">
                      <span className="w-5 h-5 rounded-full border-2 border-primary shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 견적 힌트 */}
            {hintEntries.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {hintEntries.map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    area_pyeong: "평수", budget: "예산", style: "스타일",
                    move_in: "입주 희망", trades: "공종",
                  };
                  const display = Array.isArray(val) ? val.join(", ") : String(val);
                  return (
                    <div key={key} className="bg-muted rounded-xl px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">{labelMap[key] ?? key}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{display}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 전문 보기 토글 */}
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              {showRaw ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              전체 녹취록 {showRaw ? "숨기기" : "보기"}
            </button>
            {showRaw && (
              <div className="bg-muted rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{result.rawTranscript}</p>
              </div>
            )}

            {/* 저장 버튼 */}
            {saved ? (
              <div className="flex items-center gap-2 justify-center py-3 text-profit font-semibold">
                <CheckCircleIcon size={18} />
                상담 기록이 저장되었습니다
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStage("idle")}
                  className="flex-1 h-13 rounded-xl border border-border text-base font-semibold text-foreground active:bg-muted"
                >
                  다시 녹음
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-[2] h-13 rounded-xl bg-primary text-primary-foreground text-base font-bold active:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2Icon size={18} className="animate-spin" /> : null}
                  고객 기록에 저장
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
