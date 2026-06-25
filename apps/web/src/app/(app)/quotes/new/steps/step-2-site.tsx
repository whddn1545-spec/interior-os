"use client";

import { useState, useTransition, useEffect } from "react";
import { createSite, getDistanceZones } from "../actions";
import { DIFFICULTY_FACTORS } from "@interior-os/core/pricing";

interface DistanceZone {
  id: string;
  name: string;
  distanceFactor: number;
}

interface Props {
  customerId: string;
  onNext: (siteId: string, distanceFactor: number, difficultyFactor: number, areaPyeong: number) => void;
  onBack: () => void;
}

const DIFFICULTY_OPTIONS: { key: keyof typeof DIFFICULTY_FACTORS; label: string; desc: string }[] = [
  { key: "easy", label: "쉬움", desc: "빈집, 자재 반입 쉬움" },
  { key: "normal", label: "보통", desc: "거주 중, 일반" },
  { key: "hard", label: "어려움", desc: "고층·엘리베이터 없음·협소" },
];

export function Step2Site({ customerId, onNext, onBack }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [areaPyeong, setAreaPyeong] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [zones, setZones] = useState<DistanceZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getDistanceZones();
      if (res.ok) setZones(res.data);
    });
  }, []);

  function handleNext() {
    if (!name.trim() || !address.trim() || !areaPyeong) {
      setError("현장명, 주소, 평수를 모두 입력해주세요");
      return;
    }
    const area = parseFloat(areaPyeong);
    if (isNaN(area) || area <= 0) {
      setError("올바른 평수를 입력해주세요");
      return;
    }

    const selectedZone = zones.find((z) => z.id === selectedZoneId);
    const distanceFactor = selectedZone?.distanceFactor ?? 1.0;
    const difficultyFactor = DIFFICULTY_FACTORS[difficulty];

    startTransition(async () => {
      const res = await createSite({
        customerId,
        name: name.trim(),
        address: address.trim(),
        areaPyeong: area,
        difficulty,
        distanceZoneId: selectedZoneId || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onNext(res.data.id, distanceFactor, difficultyFactor, area);
    });
  }

  return (
    <div className="px-4 pt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">어떤 집인가요?</h2>
      <p className="text-lg text-gray-500 mb-6">현장 정보를 입력하세요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-1">현장명</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="○○아파트 33평"
            className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-1">현장 주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울시 강남구 ..."
            className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-1">면적</label>
          <div className="relative">
            <input
              type="number"
              value={areaPyeong}
              onChange={(e) => setAreaPyeong(e.target.value)}
              placeholder="33"
              min="1"
              max="999"
              className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-500">평</span>
          </div>
          {areaPyeong && !isNaN(parseFloat(areaPyeong)) && parseFloat(areaPyeong) > 0 && (
            <p className="text-sm text-gray-400 mt-1 ml-1">
              ≈ {(parseFloat(areaPyeong) * 3.305785).toFixed(1)} ㎡
            </p>
          )}
        </div>

        {/* 거리 구역 */}
        {zones.length > 0 && (
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">거리</label>
            <div className="grid grid-cols-2 gap-2">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`py-3 px-4 rounded-xl border-2 text-base font-medium text-left ${
                    selectedZoneId === zone.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {zone.name}
                  <span className="block text-sm text-gray-400">×{zone.distanceFactor.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 난이도 */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">난이도</label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                className={`py-3 px-2 rounded-xl border-2 text-sm font-medium ${
                  difficulty === key
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span className="block text-base font-bold">{label}</span>
                <span className="text-xs text-gray-400 mt-0.5 block leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-base">{error}</p>}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 py-4 text-lg border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          ◀ 이전
        </button>
        <button
          onClick={handleNext}
          disabled={isPending}
          className="flex-1 py-4 text-lg bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "다음 ▶"}
        </button>
      </div>
    </div>
  );
}
