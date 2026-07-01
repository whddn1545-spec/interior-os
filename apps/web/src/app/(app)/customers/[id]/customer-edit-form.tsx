"use client";

import { useState, useTransition } from "react";
import { XIcon, PencilIcon, CheckIcon } from "lucide-react";
import { updateCustomer } from "./actions";
import { formatPhone } from "@/lib/utils";

const SOURCE_OPTIONS = [
  { value: "referral", label: "소개" },
  { value: "online", label: "온라인" },
  { value: "repeat", label: "재방문" },
  { value: "etc", label: "기타" },
];

interface Props {
  customerId: string;
  initial: {
    name: string;
    phone: string;
    address: string;
    source: string;
    memo: string;
  };
}

export function CustomerEditForm({ customerId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [source, setSource] = useState(initial.source);
  const [memo, setMemo] = useState(initial.memo);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (name.trim().length < 2) { setError("이름을 2자 이상 입력해주세요"); return; }
    if (!phone.trim()) { setError("연락처를 입력해주세요"); return; }
    startTransition(async () => {
      setError(null);
      const result = await updateCustomer(customerId, { name, phone, address, source, memo });
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 bg-muted text-foreground/90 px-3 py-2.5 rounded-xl text-base font-semibold"
      >
        <PencilIcon size={15} />
        수정
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">고객 정보 수정</h2>
              <button onClick={() => setOpen(false)} className="p-3 text-muted-foreground/70 active:bg-muted rounded-xl">
                <XIcon size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">연락처 *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">주소</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-3">유입 경로</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSource(opt.value)}
                      className={`py-3 rounded-2xl border-2 text-base font-medium transition-colors ${
                        source === opt.value
                          ? "border-blue-600 bg-primary text-white"
                          : "border-border bg-card text-foreground/90"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-base font-semibold text-foreground/90 mb-2">메모</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss">{error}</div>
              )}

              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckIcon size={22} />
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
