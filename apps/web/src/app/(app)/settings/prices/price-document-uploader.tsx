"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScanLineIcon, CheckIcon, XIcon, AlertTriangleIcon, ChevronDownIcon } from "lucide-react";
import { analyzePriceDocument, bulkSaveExtractedPrices } from "./actions";
import type { ExtractedPriceItem } from "@/lib/ai/claude";

interface Trade {
  id: string;
  code: string;
  name_ko: string;
}

interface EditableItem extends ExtractedPriceItem {
  tradeId: string;
  selected: boolean;
}

const CONFIDENCE_LABEL = {
  high: { label: "확실", cls: "text-green-700 bg-green-50" },
  medium: { label: "보통", cls: "text-amber-700 bg-amber-50" },
  low: { label: "불확실", cls: "text-red-700 bg-red-50" },
};

export function PriceDocumentUploader({ trades }: { trades: Trade[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "analyzing" | "review" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const tradeByCode = new Map(trades.map((t) => [t.code, t]));

  function resolveTradeId(code: string): string {
    return tradeByCode.get(code)?.id ?? tradeByCode.get("other")?.id ?? trades[0]?.id ?? "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("JPEG, PNG, WebP 이미지만 지원해요. PDF는 스크린샷으로 찍어 올려주세요. HEIC는 사진 앱 → 내보내기 → JPEG로 변환해주세요.");
      return;
    }

    if (file.size > 4.5 * 1024 * 1024) {
      setError("파일이 너무 커요 (최대 4.5MB)");
      return;
    }

    setError(null);
    setPhase("analyzing");

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";

      startTransition(async () => {
        const result = await analyzePriceDocument(base64, file.type);
        if (!result.ok) {
          setError(result.error);
          setPhase("idle");
          return;
        }
        const editables: EditableItem[] = result.data.items.map((item) => ({
          ...item,
          tradeId: resolveTradeId(item.tradeCode),
          selected: true,
        }));
        setItems(editables);
        setPhase("review");
      });
    };
    reader.readAsDataURL(file);
  }

  function toggleSelect(idx: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
    );
  }

  function updateItem(idx: number, field: keyof EditableItem, value: string | number | boolean) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  function handleSave() {
    const toSave = items
      .filter((it) => it.selected && it.tradeId)
      .map((it) => ({
        tradeId: it.tradeId,
        itemName: it.itemName,
        materialUnitPrice: Number(it.materialUnitPrice),
        laborDayRate: Number(it.laborDayRate),
        defaultDaysPerUnit: Number(it.defaultDaysPerUnit),
      }));

    if (!toSave.length) {
      setError("저장할 항목을 하나 이상 선택해주세요");
      return;
    }

    setPhase("saving");
    startTransition(async () => {
      const result = await bulkSaveExtractedPrices(toSave);
      if (!result.ok) {
        setError(result.error);
        setPhase("review");
        return;
      }
      setSuccess(`${result.data.count}개 단가를 저장했어요.`);
      setPhase("idle");
      setItems([]);
      router.refresh();
    });
  }

  function reset() {
    setPhase("idle");
    setItems([]);
    setError(null);
  }

  if (phase === "idle" || phase === "analyzing") {
    return (
      <div className="mb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base mb-3 flex gap-2 items-start">
            <AlertTriangleIcon size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-base mb-3 flex gap-2 items-center">
            <CheckIcon size={18} />
            {success}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => { setError(null); setSuccess(null); fileInputRef.current?.click(); }}
          disabled={phase === "analyzing"}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-2xl py-4 text-lg font-bold disabled:opacity-60 active:bg-indigo-700"
        >
          {phase === "analyzing" ? (
            <>
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              AI가 단가표를 읽고 있어요...
            </>
          ) : (
            <>
              <ScanLineIcon size={22} />
              📄 사진·문서로 단가 가져오기
            </>
          )}
        </button>
        <p className="text-sm text-gray-400 text-center mt-2">
          단가표 사진을 찍어 올리면 AI가 자동으로 읽어줘요
        </p>
        <p className="text-xs text-gray-300 text-center mt-1">
          PDF 지원은 추후 추가 예정
        </p>
      </div>
    );
  }

  const selectedCount = items.filter((it) => it.selected).length;

  return (
    <div className="mb-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-indigo-900">AI 추출 결과</h3>
          <button onClick={reset} className="p-1.5 text-gray-500">
            <XIcon size={20} />
          </button>
        </div>
        <p className="text-base text-indigo-700">
          {items.length}개 항목을 찾았어요. 틀린 내용은 수정하고, 필요 없는 항목은 체크를 해제하세요.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base mb-3">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {items.map((item, idx) => {
          const conf = CONFIDENCE_LABEL[item.confidence];
          return (
            <div
              key={idx}
              className={`rounded-2xl border-2 overflow-hidden ${item.selected ? "border-indigo-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}
            >
              {/* 헤더 행 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleSelect(idx)}
                  className="w-5 h-5 accent-indigo-600"
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                    className="text-base font-bold text-gray-900 bg-transparent w-full focus:outline-none focus:border-b focus:border-indigo-400"
                    placeholder="자재명"
                  />
                  <p className="text-xs text-gray-400 truncate">문서 원문: {item.tradeNameFromDoc}</p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 ${conf.cls}`}>
                  {conf.label}
                </span>
              </div>

              {/* 공종 선택 */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                <span className="text-sm text-gray-500 shrink-0">공종</span>
                <div className="relative flex-1">
                  <select
                    value={item.tradeId}
                    onChange={(e) => updateItem(idx, "tradeId", e.target.value)}
                    className="w-full text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 appearance-none pr-8"
                  >
                    {trades.map((t) => (
                      <option key={t.id} value={t.id}>{t.name_ko}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 수치 입력 */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">자재단가(원)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={item.materialUnitPrice}
                    onChange={(e) => updateItem(idx, "materialUnitPrice", Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">일당(원)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={item.laborDayRate}
                    onChange={(e) => updateItem(idx, "laborDayRate", Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">단위당 작업일</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={item.defaultDaysPerUnit}
                    onChange={(e) => updateItem(idx, "defaultDaysPerUnit", Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {item.note && (
                <p className="px-4 pb-3 text-xs text-amber-700">⚠️ {item.note}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || selectedCount === 0}
          className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 text-lg font-bold disabled:opacity-50 active:bg-indigo-700"
        >
          {phase === "saving" ? "저장 중..." : `✅ ${selectedCount}개 단가 저장하기`}
        </button>
        <button
          onClick={reset}
          className="bg-gray-100 text-gray-700 rounded-2xl px-5 py-4 text-base font-semibold"
        >
          취소
        </button>
      </div>
    </div>
  );
}
