"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, RotateCcwIcon, FileTextIcon, MessageSquareIcon, FileSignatureIcon, Share2Icon, CopyIcon, Trash2Icon, AlertTriangleIcon, PencilIcon, MinusCircleIcon } from "lucide-react";
import { confirmQuote } from "../new/actions";
import { revertQuoteToDraft, generateQuotePdf, createContractFromQuote, deleteQuote, duplicateQuote, getQuoteForEdit, updateQuoteItems } from "./actions";
import type { EditableQuoteItem } from "./actions";
import { calcQuote, formatKRW } from "@interior-os/core/pricing";
import { toast } from "sonner";

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

  // 항목 수정 모드
  const [editItems, setEditItems] = useState<EditableQuoteItem[] | null>(null);
  const [editFactors, setEditFactors] = useState<{
    distanceFactor: number;
    difficultyFactor: number;
    reserveRate: number;
    contingencyRate: number;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  function handleStartEdit() {
    setError(null);
    setLoadingEdit(true);
    startTransition(async () => {
      const result = await getQuoteForEdit(quoteId);
      setLoadingEdit(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditItems(result.data.items);
      setEditFactors({
        distanceFactor: result.data.distanceFactor,
        difficultyFactor: result.data.difficultyFactor,
        reserveRate: result.data.reserveRate,
        contingencyRate: result.data.contingencyRate,
      });
    });
  }

  function handleEditQty(id: string, value: string) {
    const qty = parseFloat(value);
    setEditItems((prev) =>
      prev
        ? prev.map((it) => (it.id === id ? { ...it, quantity: Number.isFinite(qty) ? qty : 0 } : it))
        : prev
    );
  }

  function handleRemoveEditItem(id: string) {
    setEditItems((prev) => (prev ? prev.filter((it) => it.id !== id) : prev));
  }

  function handleCancelEdit() {
    setEditItems(null);
    setEditFactors(null);
    setError(null);
  }

  function handleSaveEdit() {
    if (!editItems) return;
    const remaining = editItems.filter((it) => it.quantity > 0);
    if (remaining.length === 0) {
      setError("최소 한 개 이상의 항목이 필요해요. 모두 빼려면 견적을 삭제해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateQuoteItems(
        quoteId,
        remaining.map((it) => ({
          tradeId: it.tradeId,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          materialUnitPrice: it.materialUnitPrice,
          laborDayRate: it.laborDayRate,
          defaultDaysPerUnit: it.defaultDaysPerUnit,
        }))
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditItems(null);
      setEditFactors(null);
      router.refresh();
    });
  }

  // 수정 화면 실시간 합계 미리보기 (서버 재계산과 동일 로직)
  const editPreview =
    editItems && editFactors
      ? calcQuote({
          items: editItems
            .filter((it) => it.quantity > 0)
            .map((it) => ({
              tradeId: it.tradeId,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              price: {
                materialUnitPrice: it.materialUnitPrice,
                laborDayRate: it.laborDayRate,
                defaultDaysPerUnit: it.defaultDaysPerUnit,
              },
            })),
          distanceFactor: editFactors.distanceFactor,
          difficultyFactor: editFactors.difficultyFactor,
          reserveRate: editFactors.reserveRate,
          contingencyRate: editFactors.contingencyRate,
        })
      : null;

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
        toast.success("링크가 복사되었어요");
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
        router.push(`/contracts/${result.data.contractId}?from=/quotes/${quoteId}`);
      }
    });
  }

  const finalRate = 100 - depositRate - interimRate;

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
          {error}
        </div>
      )}

      {/* draft 상태: 확정 버튼 */}
      {status === "draft" && (
        <>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isPending}
            className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
          >
            ✅ 이 금액으로 확정하기
          </button>
          <button
            onClick={handleStartEdit}
            disabled={isPending || loadingEdit}
            className="flex items-center justify-center gap-2 w-full bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
          >
            <PencilIcon size={20} />
            {loadingEdit ? "불러오는 중..." : "항목 수정하기"}
          </button>
          <p className="text-base text-gray-500 text-center px-2">
            항목 한 줄을 빼거나 수량을 고치면 금액이 자동으로 다시 계산돼요
          </p>
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
            className="flex items-center justify-center gap-2 w-full bg-red-50 text-loss border border-loss/30 rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
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
            className="flex items-center justify-center gap-2 w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
          >
            <FileTextIcon size={22} />
            {generatingPdf === "customer" ? "PDF 생성 중..." : "고객용 견적서 PDF"}
          </button>
          {pdfUrl && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full bg-primary/10 text-primary/90 border border-primary/30 rounded-2xl py-4 text-lg font-semibold"
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
            className="flex items-center justify-center gap-2 w-full bg-profit text-white rounded-2xl py-4 text-lg font-semibold"
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
              <CheckCircleIcon size={48} className="mx-auto text-primary mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">이 금액으로 확정할까요?</h3>
              <p className="text-3xl font-black text-primary/90 mt-2">{formatKRW(totalAmount)}</p>
              <p className="text-base text-gray-500 mt-2">
                확정 후에는 고객용 PDF를 만들거나 계약서를 작성할 수 있어요
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
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
                className="w-full bg-loss text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
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
              {/* 빠른 선택 프리셋 */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">자주 쓰는 비율 (계약금/중도금/잔금)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { d: 30, i: 40, label: "30 / 40 / 30" },
                    { d: 30, i: 30, label: "30 / 30 / 40" },
                    { d: 40, i: 30, label: "40 / 30 / 30" },
                    { d: 50, i: 30, label: "50 / 30 / 20" },
                  ].map(({ d, i, label }) => {
                    const isActive = depositRate === d && interimRate === i;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { setDepositRate(d); setInterimRate(i); }}
                        className={`py-3 rounded-xl border-2 text-base font-semibold transition-colors ${
                          isActive ? "border-blue-500 bg-primary/10 text-primary/90" : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 직접 조정 */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">직접 조정</label>
                <div className="space-y-3">
                  {[
                    { label: "계약금", value: depositRate, set: setDepositRate },
                    { label: "중도금", value: interimRate, set: setInterimRate },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-base font-medium text-gray-700 w-16">{label}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => set(Math.max(0, value - 5))}
                          className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-xl font-bold text-gray-700 flex items-center justify-center active:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="text-xl font-black text-primary/90 w-16 text-center">{value}%</span>
                        <button
                          type="button"
                          onClick={() => set(Math.min(80, value + 5))}
                          className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-xl font-bold text-gray-700 flex items-center justify-center active:bg-gray-100"
                        >
                          +
                        </button>
                        <span className="text-sm text-gray-500 w-20 text-right">{formatKRW(totalAmount * value / 100)}</span>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* 항목 수정 화면 (draft 전용) */}
      {editItems && editFactors && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end overflow-y-auto">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8 mt-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">항목 수정하기</h3>
            <p className="text-base text-gray-500 mb-5">
              빼고 싶은 항목은 빼고, 수량은 직접 고칠 수 있어요
            </p>

            {error && (
              <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 mb-4 text-loss text-base">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-5">
              {editItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900">
                        {item.tradeName ? `${item.tradeName} · ` : ""}{item.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveEditItem(item.id)}
                      className="flex items-center gap-1 text-red-500 text-base font-medium shrink-0 py-1"
                    >
                      <MinusCircleIcon size={20} />
                      빼기
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-500 shrink-0">수량</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => handleEditQty(item.id, e.target.value)}
                      className="w-28 px-3 py-3 text-lg border border-gray-300 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-base text-gray-500">{item.unit}</span>
                  </div>
                </div>
              ))}
              {editItems.length === 0 && (
                <p className="text-base text-gray-500 text-center py-6">
                  모든 항목을 뺐어요. 견적을 유지하려면 항목이 최소 한 개는 있어야 해요.
                </p>
              )}
            </div>

            {/* 실시간 합계 */}
            {editPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
                <div className="flex justify-between text-base text-gray-600 mb-1">
                  <span>소계</span>
                  <span>{formatKRW(editPreview.subtotal)}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-gray-300 pt-2 mt-2">
                  <span className="text-lg font-bold text-gray-900">새 합계</span>
                  <span className="text-2xl font-black text-primary/90">{formatKRW(editPreview.total)}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSaveEdit}
                disabled={isPending || editItems.filter((it) => it.quantity > 0).length === 0}
                className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
              >
                {isPending ? "저장 중..." : "수정 내용 저장하기"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isPending}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
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
