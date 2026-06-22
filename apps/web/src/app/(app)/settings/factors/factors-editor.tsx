"use client";

import { useState, useTransition } from "react";
import { upsertDistanceZone } from "./actions";

interface Zone {
  id: string;
  name: string;
  distance_factor: number;
}

const DIFFICULTY_INFO = [
  { key: "easy", label: "쉬움", factor: 1.00, desc: "빈집, 자재 반입 용이" },
  { key: "normal", label: "보통", factor: 1.10, desc: "거주 중, 일반 현장" },
  { key: "hard", label: "어려움", factor: 1.25, desc: "고층·엘리베이터 없음·협소" },
] as const;

const RATE_INFO = [
  { key: "reserve", label: "예비율", defaultVal: 20, desc: "공사 지연 대비 (기본 20%)" },
  { key: "contingency", label: "비상율", defaultVal: 10, desc: "돌발 비용 대비 (기본 10%)" },
] as const;

export function FactorsEditor({ zones }: { zones: Zone[] }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [editFactor, setEditFactor] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFactor, setNewFactor] = useState("1.00");

  function startEdit(zone: Zone) {
    setEditing(zone.id);
    setEditFactor(String(zone.distance_factor));
  }

  function saveZone(zoneId: string, zoneName: string) {
    const factor = parseFloat(editFactor);
    if (isNaN(factor) || factor < 1 || factor > 3) return;

    startTransition(async () => {
      await upsertDistanceZone({ id: zoneId, name: zoneName, distanceFactor: factor });
      setEditing(null);
      setSuccess("저장했어요");
      setTimeout(() => setSuccess(null), 2000);
    });
  }

  function addZone() {
    const factor = parseFloat(newFactor);
    if (!newName.trim() || isNaN(factor) || factor < 1 || factor > 3) return;
    startTransition(async () => {
      await upsertDistanceZone({ name: newName.trim(), distanceFactor: factor });
      setAdding(false);
      setNewName("");
      setNewFactor("1.00");
      setSuccess("구역을 추가했어요");
      setTimeout(() => setSuccess(null), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* 거리 계수 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">거리 계수</h2>
            <p className="text-sm text-gray-500">현장까지 거리에 따라 견적 금액에 곱해지는 계수</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50"
          >
            + 구역 추가
          </button>
        </div>

        {adding && (
          <div className="px-4 py-4 border-b border-gray-100 bg-blue-50">
            <p className="text-sm font-semibold text-gray-700 mb-3">새 거리 구역</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 가까운 곳 (30분 이내)"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">계수:</span>
              <input
                type="number"
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                step="0.05"
                min="1"
                max="3"
                className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={addZone}
                disabled={isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                추가
              </button>
              <button onClick={() => setAdding(false)} className="text-gray-500 text-sm px-2">취소</button>
            </div>
          </div>
        )}

        {zones.length === 0 && !adding ? (
          <div className="px-4 py-6 text-center text-gray-400">
            <p className="mb-2">거리 구역이 없어요</p>
            <button onClick={() => setAdding(true)} className="text-blue-600 text-sm font-medium">+ 구역 추가하기</button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {zones.map((zone) => (
              <li key={zone.id} className="px-4 py-4">
                {editing === zone.id ? (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-base font-medium text-gray-800">{zone.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editFactor}
                        onChange={(e) => setEditFactor(e.target.value)}
                        step="0.01"
                        min="1"
                        max="3"
                        className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-lg text-center focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={() => saveZone(zone.id, zone.name)}
                        disabled={isPending}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-gray-500 px-3 py-2 rounded-xl text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-medium text-gray-800">{zone.name}</p>
                      <p className="text-sm text-gray-500">× {zone.distance_factor.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => startEdit(zone)}
                      className="text-blue-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-blue-50"
                    >
                      수정
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 난이도 계수 — 코어 패키지 고정값 안내 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">난이도 계수</h2>
          <p className="text-sm text-gray-500">견적 마법사에서 현장 난이도 선택 시 자동 적용</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {DIFFICULTY_INFO.map((d) => (
            <li key={d.key} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-800">{d.label}</p>
                <p className="text-sm text-gray-500">{d.desc}</p>
              </div>
              <span className="text-lg font-bold text-gray-700">× {d.factor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 예비·비상율 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">예비·비상율</h2>
          <p className="text-sm text-gray-500">견적 합계에 자동으로 더해지는 가산율</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {RATE_INFO.map((r) => (
            <li key={r.key} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-800">{r.label}</p>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
              <span className="text-lg font-bold text-blue-600">+{r.defaultVal}%</span>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-700">예비·비상율은 견적 마법사에서 항목별로 조정할 수 있어요.</p>
        </div>
      </div>

      {success && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg">
          {success}
        </div>
      )}
    </div>
  );
}
