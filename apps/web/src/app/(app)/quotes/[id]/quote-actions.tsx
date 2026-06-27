"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, RotateCcwIcon, FileTextIcon, MessageSquareIcon, FileSignatureIcon, Share2Icon, CopyIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { confirmQuote } from "../new/actions";
import { revertQuoteToDraft, generateQuotePdf, createContractFromQuote, deleteQuote, duplicateQuote } from "./actions";
import { formatKRW } from "@interior-os/core/pricing";

interface Props {
  quoteId: string;
  status: string;
  siteId: string;
  customerId: string;
  totalAmount: number;
}

export function QuoteActions({ quoteId, status, siteId, customerId, totalAmount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [depositRate, setDepositRate] = useState(30);
  const [interimRate, setInterimRate] = useState(40);
  const [specialTerms, setSpecialTerms] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<"customer" | "internal" | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmQuote(quoteId);
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowConfirmDialog(false);
        router.refresh();
      }
    });
  }

  function handleRevert() {
    startTransition(async () => {
      const result = await revertQuoteToDraft(quoteId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push(`/quotes/${result.data.quoteId}`);
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteQuote(quoteId);
      if (!result.ok) {
        setError(result.error);
        setShowDeleteDialog(false);
      } else {
        router.push("/quotes");
      }
    });
  }

  async function handleGeneratePdf(audience: "customer" | "internal") {
    setGeneratingPdf(audience);
    setError(null);
    const result = await generateQuotePdf(quoteId, audience);
    setGeneratingPdf(null);
    if (!result.ok) {
      setError(result.error);
    } else {
      setPdfUrl(result.data.url);
      window.open(result.data.url, "_blank");
      router.refresh();
    }
  }

  async function handleShare() {
    if (!pdfUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "견적서", text: "인테리어 견적서를 확인해주세요", url: pdfUrl });
      } else {
        await navigator.clipboard.writeText(pdfUrl);
        alert("링크가 복사되었어요");
      }
    } catch {
      // 사용자가 공유 취소한 경우 무시
    }
  }

  function handleCreateContract() {
    const finalRate = 100 - depositRate - interimRate;
    if (finalRate < 0) {
      setError("계약금 + 중도금 합계가 100%를 초과합니다");
      return;
    }
    startTransition(async () => {
      const result = await createContractFromQuote(quoteId, {
        specialTerms: specialTerms || undefined,
        depositRate: depositRate / 100,
        interimRate: interimRate / 100,
        finalRate: finalRate / 100,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowContractDialog(false);
        router.push(`/contracts/${result.data.contractId}`);
      }
    });
  }

  const finalRate = 100 - depositRate - interimRate;

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
          {error}
        </div>
      )}

      {/* draft 상태: 확정 버튼 */}
      {status === "draft" && (
        <>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isPending}
            className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
          >
            ✅ 이 금액으로 확정하기
          </button>
          <button
            onClick={handleDuplicate}
            disabled={isPending}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
          >
            <CopyIcon size={20} />
            {isPending ? "복제 중..." : "이 견적 복제하기"}
          </button>
          <p className="text-base text-gray-500 text-center px-2">
            같은 현장의 항목·금액을 그대로 복사해 새 견적으로 만들어요
          </p>

          <button
            onClick={() =>
              router.push(
                customerId ? `/quotes/new?customerId=${customerId}` : `/quotes/new`
              )
            }
            disabled={isPending}
            className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
          >
            📝 처음부터 새로 견적 작성
          </button>
          <p className="text-base text-gray-500 text-center px-2">
            이 견적은 그대로 두고, 같은 고객으로 새 견적을 처음부터 만들어요
          </p>

          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 border border-red-200 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
          >
            <Trash2Icon size={20} />
            이 견적 삭제
          </button>
        </>
      )}

      {/* confirmed 상태: PDF, 계약서, 문자 */}
      {status === "confirmed" && (
        <>
          <button
            onClick={() => handleGeneratePdf("customer")}
            disabled={generatingPdf !== null}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
          >
            <FileTextIcon size={22} />
            {generatingPdf === "customer" ? "PDF 생성 중..." : "고객용 견적서 PDF"}
          </button>
          {pdfUrl && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl py-4 text-lg font-semibold"
            >
              <Share2Icon size={20} />
              PDF 링크 공유하기
            </button>
          )}
          <button
            onClick={() => handleGeneratePdf("internal")}
            disabled={generatingPdf !== null}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
          >
            <FileTextIcon size={20} />
            {generatingPdf === "internal" ? "생성 중..." : "내부용(원가 포함) PDF"}
          </button>
          <button
            onClick={() => router.push(`/messages?siteId=${siteId}&quoteId=${quoteId}`)}
            className="flex items-center justify-center gap-2 w-full bg-green-600 text-white rounded-2xl py-4 text-lg font-semibold"
          >
            <MessageSquareIcon size={20} />
            고객에게 문자 보내기
          </button>
          <button
            onClick={() => setShowContractDialog(true)}
            className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white rounded-2xl py-4 text-lg font-semibold"
          >
            <FileSignatureIcon size={20} />
            계약서 만들기
          </button>
          <button
            onClick={handleRevert}
            disabled={isPending}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-600 rounded-2xl py-3 text-base font-medium disabled:opacity-50"
          >
            <RotateCcwIcon size={16} />
            임시저장으로 되돌리기
          </button>
        </>
      )}

      {/* sent/accepted 상태: 계약서로 이동 */}
      {(status === "sent" || status === "accepted") && (
        <button
          onClick={() => setShowContractDialog(true)}
          className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white rounded-2xl py-4 text-lg font-semibold"
        >
          <FileSignatureIcon size={20} />
          계약서 만들기
        </button>
      )}

      {/* 확정 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <div className="text-center mb-6">
              <CheckCircleIcon size={48} className="mx-auto text-blue-600 mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">이 금액으로 확정할까요?</h3>
              <p className="text-3xl font-black text-blue-700 mt-2">{formatKRW(totalAmount)}</p>
              <p className="text-base text-gray-500 mt-2">
                확정 후에는 고객용 PDF를 만들거나 계약서를 작성할 수 있어요
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "네, 확정합니다"}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium"
              >
                다시 확인할게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <div className="text-center mb-6">
              <AlertTriangleIcon size={48} className="mx-auto text-red-500 mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">이 견적을 삭제할까요?</h3>
              <p className="text-base text-gray-500 mt-2">
                삭제하면 이 임시저장 견적과 모든 항목이 완전히 지워져요. 되돌릴 수 없어요.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full bg-red-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
              >
                {isPending ? "삭제 중..." : "네, 삭제합니다"}
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={isPending}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
              >
                아니요, 그대로 둘게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계약서 생성 다이얼로그 */}
      {showContractDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end overflow-y-auto">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8 mt-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">계약서 만들기</h3>
            <p className="text-base text-gray-500 mb-6">대금 지급 조건을 설정해주세요</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  계약금 <span className="text-blue-600">{depositRate}%</span>
                  <span className="text-gray-500 text-base ml-2">{formatKRW(totalAmount * depositRate / 100)}</span>
                </label>
                <input
                  type="range" min={0} max={80} step={5} value={depositRate}
                  onChange={(e) => setDepositRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  중도금 <span className="text-blue-600">{interimRate}%</span>
                  <span className="text-gray-500 text-base ml-2">{formatKRW(totalAmount * interimRate / 100)}</span>
                </label>
                <input
                  type="range" min={0} max={80} step={5} value={interimRate}
                  onChange={(e) => setInterimRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">잔금 ({Math.max(0, finalRate)}%)</span>
                  <span className="font-semibold text-gray-900">{formatKRW(totalAmount * Math.max(0, finalRate) / 100)}</span>
                </div>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">특약사항 (선택)</label>
                <textarea
                  value={specialTerms}
                  onChange={(e) => setSpecialTerms(e.target.value)}
                  placeholder="하자 보증 기간, 추가 요청사항 등..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base resize-none focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCreateContract}
                disabled={isPending || finalRate < 0}
                className="w-full bg-purple-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
              >
                {isPending ? "생성 중..." : "계약서 만들기"}
              </button>
              <button
                onClick={() => setShowContractDialog(false)}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium"
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
