"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { SearchIcon, PlusIcon, UserIcon } from "lucide-react";
import { searchCustomers, createCustomer } from "../actions";
import { formatPhone } from "@/lib/utils";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  onNext: (customer: CustomerOption) => void;
  initialCustomer?: CustomerOption;
}

export function Step1Customer({ onNext, initialCustomer }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // 이미 선택된 고객(고객 상세에서 진입 또는 이어쓰기)이 있으면 카드로 보여주고
  // '변경'을 누르기 전까지는 검색 UI를 숨긴다.
  const [selected, setSelected] = useState<CustomerOption | undefined>(initialCustomer);

  // 디바운스 타이머와 마지막 요청 순번(레이스 가드)을 ref로 관리한다.
  // 느린 모바일에서 응답이 순서 뒤바뀌어 도착해도 가장 최근 요청 결과만 반영한다.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestSeqRef = useRef(0);

  // 언마운트 시 대기 중인 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(value: string) {
    setQuery(value);

    // 이전 디바운스 타이머 취소
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // 60대 사용자가 천천히 타이핑할 때 결과가 계속 바뀌지 않도록
    // 최소 2글자부터 검색한다.
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    // 250ms 디바운스: 연속 타이핑 중에는 마지막 입력만 검색한다.
    debounceRef.current = setTimeout(() => {
      const seq = ++requestSeqRef.current;
      startTransition(async () => {
        const res = await searchCustomers(trimmed);
        // 더 최근 요청이 시작됐다면 이 응답은 버린다(순서 가드).
        if (seq !== requestSeqRef.current) return;
        if (res.ok) setResults(res.data);
      });
    }, 250);
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

  // 선택된 고객 카드 표시 (변경 누르기 전까지 검색 숨김)
  if (selected) {
    return (
      <div className="px-4 pt-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">누구 집인가요?</h2>
        <p className="text-lg text-muted-foreground mb-6">선택된 고객이에요</p>

        <div className="flex items-center gap-4 bg-card border border-primary/30 rounded-xl px-4 py-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <UserIcon size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground">{selected.name}</p>
            <p className="text-base text-muted-foreground">{selected.phone}</p>
          </div>
          <button
            onClick={() => setSelected(undefined)}
            className="px-4 py-3 text-base font-medium text-primary border border-primary/30 rounded-xl"
          >
            변경
          </button>
        </div>

        <button
          onClick={() => onNext(selected)}
          className="w-full py-4 text-lg bg-primary text-white rounded-xl font-semibold"
        >
          다음
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h2 className="text-2xl font-bold text-foreground mb-2">누구 집인가요?</h2>
      <p className="text-lg text-muted-foreground mb-6">고객을 검색하거나 새로 추가하세요</p>

      {/* 검색 */}
      <div className="relative mb-4">
        <SearchIcon size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 또는 전화번호 검색"
          className="w-full pl-12 pr-4 py-4 text-lg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/500 bg-card"
        />
      </div>

      {/* 검색 결과 */}
      {results.length > 0 && (
        <ul className="mb-4 space-y-2">
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onNext(c)}
                className="w-full flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-4 text-left active:border-blue-400 active:bg-primary/10"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <UserIcon size={22} className="text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{c.name}</p>
                  <p className="text-base text-muted-foreground">{c.phone}</p>
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
          className="w-full flex items-center gap-3 border-2 border-dashed border-border rounded-xl px-4 py-4 text-lg text-muted-foreground active:border-blue-400 active:text-primary"
        >
          <PlusIcon size={24} />
          새 고객 추가
        </button>
      )}

      {/* 새 고객 폼 */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">새 고객 정보</h3>
          <div>
            <label className="block text-base font-medium text-foreground/90 mb-1">이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/500"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-foreground/90 mb-1">전화번호</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/500"
            />
          </div>
          {error && <p className="text-red-500 text-base">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 py-3 text-lg border border-border rounded-xl text-muted-foreground"
            >
              취소
            </button>
            <button
              onClick={handleCreateNew}
              disabled={isPending}
              className="flex-1 py-3 text-lg bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
