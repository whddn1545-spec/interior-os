"use client";

import { useState, useTransition } from "react";
import { SparklesIcon, CopyIcon, ShareIcon, XIcon, RefreshCwIcon } from "lucide-react";
import { generateQuoteMessage } from "./actions";
import { ProGate } from "@/components/pro-gate";
import { toast } from "sonner";

interface Props {
  quoteId: string;
  isPro: boolean;
}

export function QuoteMessageSheet({ quoteId, isPro }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showProGate, setShowProGate] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const res = await generateQuoteMessage(quoteId);
      if (res.ok) {
        setMessage(res.message);
      } else if (res.proRequired) {
        setOpen(false);
        setShowProGate(true);
      } else {
        toast.error(res.error ?? "생성에 실패했어요");
      }
    });
  }

  function handleOpen() {
    if (!isPro) {
      setShowProGate(true);
      return;
    }
    setOpen(true);
    if (!message) generate();
  }

  async function handleCopy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    toast.success("문자 내용이 복사됐어요", { description: "카카오톡·문자앱에 붙여넣기 하세요" });
  }

  async function handleShare() {
    if (!message) return;
    if (navigator.share) {
      await navigator.share({ text: message }).catch(() => {});
    } else {
      await handleCopy();
    }
  }

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        onClick={handleOpen}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary/90 to-primary text-white rounded-2xl py-4 text-lg font-bold active:opacity-90"
      >
        <SparklesIcon size={20} />
        AI 견적 안내 문자 만들기
        {!isPro && (
          <span className="ml-1 bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
            PRO
          </span>
        )}
      </button>

      {/* 바텀시트 */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon size={20} className="text-primary" />
                <h3 className="text-xl font-black text-foreground">AI 견적 안내 문자</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-muted-foreground">
                <XIcon size={24} />
              </button>
            </div>

            {isPending ? (
              <div className="py-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-base text-muted-foreground">AI가 맞춤 문자를 작성 중이에요...</p>
              </div>
            ) : message ? (
              <>
                <div className="bg-muted rounded-2xl p-4 mb-5">
                  <p className="text-base text-foreground leading-relaxed whitespace-pre-line">{message}</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold"
                  >
                    <CopyIcon size={18} />
                    문자 내용 복사하기
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 w-full bg-muted text-foreground/90 rounded-2xl py-4 text-lg font-semibold"
                  >
                    <ShareIcon size={18} />
                    공유하기
                  </button>
                  <button
                    onClick={() => { setMessage(null); generate(); }}
                    className="flex items-center justify-center gap-2 w-full text-muted-foreground py-3 text-base"
                  >
                    <RefreshCwIcon size={16} />
                    다시 생성하기
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Pro 업그레이드 게이트 */}
      <ProGate
        feature="AI 견적 안내 문자"
        isOpen={showProGate}
        onClose={() => setShowProGate(false)}
      />
    </>
  );
}
