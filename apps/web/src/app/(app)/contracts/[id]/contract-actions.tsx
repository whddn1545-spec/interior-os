"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, CheckCircleIcon, MessageSquareIcon, CalendarPlusIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  contractId: string;
  status: string;
  siteId: string;
}

export function ContractActions({ contractId, status, siteId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setError(null);
    try {
      const res = await fetch("/api/pdf/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "PDF를 만들지 못했습니다");
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setError("PDF 주소를 받지 못했습니다");
        return;
      }
      setPdfUrl(data.url);
      window.open(data.url, "_blank");
      router.refresh();
    } catch {
      setError("PDF를 만드는 중 오류가 발생했습니다");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleShare() {
    if (!pdfUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "계약서", text: "인테리어 계약서를 확인해주세요", url: pdfUrl });
      } else {
        await navigator.clipboard.writeText(pdfUrl);
        toast.success("링크가 복사되었어요");
      }
    } catch {
      // 사용자가 공유를 취소한 경우 무시
    }
  }

  async function handleConfirm() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    void supabaseUrl; // suppress unused warning - used via server action
    startTransition(async () => {
      const res = await fetch("/api/contracts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "오류가 발생했습니다");
      } else {
        setShowConfirm(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
          {error}
        </div>
      )}

      {status === "draft" && (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold active:bg-blue-700"
        >
          <CheckCircleIcon size={22} />
          계약서 확정하기
        </button>
      )}

      {(status === "confirmed" || status === "signed") && (
        <>
          <button
            onClick={() => router.push(`/schedule/${siteId}?from=/contracts/${contractId}`)}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold active:bg-blue-700"
          >
            <CalendarPlusIcon size={22} />
            공사 일정 만들기
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center justify-center gap-2 w-full bg-white text-blue-700 border-2 border-blue-600 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50 active:bg-blue-50"
          >
            <FileTextIcon size={20} />
            {generatingPdf ? "PDF 생성 중..." : "계약서 PDF 보기"}
          </button>
          {pdfUrl && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl py-4 text-lg font-semibold active:bg-blue-100"
            >
              <Share2Icon size={20} />
              PDF 링크 공유하기
            </button>
          )}
          <button
            onClick={() => router.push(`/messages?contractId=${contractId}&siteId=${siteId}`)}
            className="flex items-center justify-center gap-2 w-full bg-green-600 text-white rounded-2xl py-4 text-lg font-semibold active:bg-green-700"
          >
            <MessageSquareIcon size={20} />
            고객에게 문자 보내기
          </button>
        </>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">계약서를 확정할까요?</h3>
            <p className="text-base text-gray-500 text-center mb-6">
              확정 후에는 PDF를 생성하고 고객에게 보낼 수 있어요
            </p>
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 active:bg-blue-700"
              >
                {isPending ? "처리 중..." : "네, 확정합니다"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium active:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
