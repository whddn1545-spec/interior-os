"use client";

import { useState, useTransition } from "react";
import { SearchIcon, PlusIcon, UserIcon } from "lucide-react";
import { searchCustomers, createCustomer } from "../actions";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  onNext: (customer: CustomerOption) => void;
}

export function Step1Customer({ onNext }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.length < 1) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const res = await searchCustomers(value);
      if (res.ok) setResults(res.data);
    });
  }

  function handleCreateNew() {
    if (!newName.trim() || !newPhone.trim()) {
      setError("이름과 전화번호를 입력해주세요");
      return;
    }
    startTransition(async () => {
      const res = await createCustomer({ name: newName, phone: newPhone });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onNext({ id: res.data.id, name: newName, phone: newPhone });
    });
  }

  return (
    <div className="px-4 pt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">누구 집인가요?</h2>
      <p className="text-lg text-gray-500 mb-6">고객을 검색하거나 새로 추가하세요</p>

      {/* 검색 */}
      <div className="relative mb-4">
        <SearchIcon size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="고객 이름 검색"
          className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* 검색 결과 */}
      {results.length > 0 && (
        <ul className="mb-4 space-y-2">
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onNext(c)}
                className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-blue-400 active:bg-blue-50"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <UserIcon size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{c.name}</p>
                  <p className="text-base text-gray-500">{c.phone}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 새 고객 추가 버튼 */}
      {!showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          <PlusIcon size={24} />
          새 고객 추가
        </button>
      )}

      {/* 새 고객 폼 */}
      {showNewForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">새 고객 정보</h3>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">전화번호</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-base">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 py-3 text-lg border border-gray-300 rounded-xl text-gray-600"
            >
              취소
            </button>
            <button
              onClick={handleCreateNew}
              disabled={isPending}
              className="flex-1 py-3 text-lg bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
