"use client";

import { useState, useTransition } from "react";
import { XIcon, CheckIcon, PencilIcon } from "lucide-react";
import { retagPhoto } from "./actions";

interface Trade {
  id: string;
  code: string;
  nameKo: string;
}

interface PhotoCardProps {
  photo: {
    id: string;
    storagePath: string;
    phase: string | null;
    tradeId: string | null;
    tradeName: string | null;
    qualityScore: number | null;
    captionHint: string | null;
    isTagged: boolean;
  };
  siteId: string;
  trades: Trade[];
  signedUrl: string | null;
}

const PHASE_LABEL: Record<string, string> = {
  before: "공사 전", progress: "시공 중", after: "완공",
};
const PHASES = ["before", "progress", "after"];

export function PhotoCard({ photo, siteId, trades, signedUrl }: PhotoCardProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<string>(photo.phase ?? "progress");
  const [tradeId, setTradeId] = useState<string>(photo.tradeId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await retagPhoto(photo.id, siteId, {
        phase,
        tradeId: tradeId || null,
      });
      setOpen(false);
    });
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="aspect-square bg-gray-100 relative">
          {signedUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={photo.captionHint ?? "현장 사진"}
                className="w-full h-full object-cover"
              />
            </>
          )}
          {photo.isTagged && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              AI 분석
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            className="absolute bottom-2 right-2 bg-white/90 text-gray-700 p-2.5 rounded-xl shadow active:bg-gray-100"
          >
            <PencilIcon size={18} />
          </button>
        </div>
        <div className="p-2">
          {photo.phase && (
            <p className="text-xs font-medium text-blue-700">{PHASE_LABEL[photo.phase] ?? photo.phase}</p>
          )}
          {photo.tradeName && (
            <p className="text-xs text-gray-600">{photo.tradeName}</p>
          )}
          {photo.captionHint && (
            <p className="text-xs text-gray-500 truncate">{photo.captionHint}</p>
          )}
          {photo.qualityScore !== null && (
            <p className="text-xs text-amber-500">품질 {Math.round(photo.qualityScore)}%</p>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">사진 분류 수정</h2>
              <button onClick={() => setOpen(false)} className="p-3 text-gray-400 active:bg-gray-100 rounded-xl">
                <XIcon size={24} />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-base font-semibold text-gray-700 mb-2">시공 단계</label>
              <div className="grid grid-cols-3 gap-2">
                {PHASES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      phase === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {PHASE_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-700 mb-2">공종</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTradeId("")}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    tradeId === "" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  선택 안 함
                </button>
                {trades.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTradeId(t.id)}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      tradeId === t.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {t.nameKo}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isPending}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckIcon size={20} />
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
