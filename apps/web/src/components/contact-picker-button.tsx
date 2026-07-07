"use client";

import { useEffect, useState } from "react";
import { BookUserIcon } from "lucide-react";
import { toast } from "sonner";

// Contact Picker API (Android Chrome 등) — 사용자가 OS 연락처 시트에서 직접 고르고,
// 선택한 항목만 앱에 전달되는 브라우저 표준. 주소록 전체 접근이 아니다.
interface PickedContact {
  name: string;
  phone: string;
}

type ContactsApi = {
  select: (
    props: string[],
    options?: { multiple?: boolean }
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function getContactsApi(): ContactsApi | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { contacts?: ContactsApi };
  return nav.contacts && typeof nav.contacts.select === "function" ? nav.contacts : null;
}

export function ContactPickerButton({
  onPick,
  label = "📱 연락처에서 가져오기",
}: {
  onPick: (contact: PickedContact) => void;
  label?: string;
}) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getContactsApi()) setSupported(true);
  }, []);

  // 미지원 브라우저(iOS Safari, 데스크톱 등)에선 버튼 자체를 숨긴다 — 수동 입력이 기본 경로
  if (!supported) return null;

  async function handlePick() {
    const api = getContactsApi();
    if (!api) return;
    try {
      const results = await api.select(["name", "tel"], { multiple: false });
      const c = results?.[0];
      if (!c) return; // 사용자가 취소
      const name = (c.name?.[0] ?? "").trim();
      const phone = (c.tel?.[0] ?? "").trim();
      if (!name && !phone) {
        toast.error("이름이나 전화번호가 없는 연락처예요");
        return;
      }
      onPick({ name, phone });
    } catch {
      // 사용자 취소 또는 권한 거부 — 조용히 무시
    }
  }

  return (
    <button
      type="button"
      onClick={handlePick}
      className="flex w-full items-center justify-center gap-2 min-h-12 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary text-base font-bold active:bg-primary/15"
    >
      <BookUserIcon size={20} />
      {label}
    </button>
  );
}
