"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ImportRow {
  name: string;
  phone: string;
  address?: string;
  memo?: string;
  source?: string;
}

export interface ImportPreview {
  rows: (ImportRow & { isDuplicate: boolean })[];
  total: number;
  duplicates: number;
}

export async function previewCsvImport(formData: FormData): Promise<{ ok: boolean; data?: ImportPreview; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "파일을 선택해주세요" };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: "데이터가 없습니다" };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("이름") || h.includes("name") || h.includes("성명"));
  const phoneIdx = headers.findIndex((h) => h.includes("전화") || h.includes("phone") || h.includes("연락처") || h.includes("휴대"));

  if (nameIdx === -1 || phoneIdx === -1) {
    return { ok: false, error: "이름, 전화번호 컬럼을 찾을 수 없어요. 헤더에 '이름', '전화번호' 또는 'name', 'phone'이 포함되어야 합니다." };
  }

  const addressIdx = headers.findIndex((h) => h.includes("주소") || h.includes("address"));
  const memoIdx = headers.findIndex((h) => h.includes("메모") || h.includes("memo") || h.includes("비고"));

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const name = cols[nameIdx]?.trim();
    const rawPhone = cols[phoneIdx]?.trim().replace(/[^0-9]/g, "");
    if (!name || !rawPhone) continue;
    const phone = rawPhone.startsWith("0") ? rawPhone : `0${rawPhone}`;
    rows.push({
      name,
      phone: phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3"),
      address: addressIdx !== -1 ? cols[addressIdx]?.trim() : undefined,
      memo: memoIdx !== -1 ? cols[memoIdx]?.trim() : undefined,
      source: "csv_contacts",
    });
  }

  // 기존 전화번호 중복 확인
  const phones = rows.map((r) => r.phone);
  const { data: existing } = await supabase
    .from("customers")
    .select("phone")
    .in("phone", phones);

  const existingPhones = new Set((existing ?? []).map((c) => (c as { phone: string }).phone));

  const preview = rows.map((r) => ({ ...r, isDuplicate: existingPhones.has(r.phone) }));

  return {
    ok: true,
    data: {
      rows: preview,
      total: preview.length,
      duplicates: preview.filter((r) => r.isDuplicate).length,
    },
  };
}

export async function importCustomers(rows: ImportRow[]): Promise<{ ok: boolean; imported: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, imported: 0, error: "로그인이 필요합니다" };

  const tenantId = user.user_metadata?.tenant_id ?? user.id;

  const inserts = rows.map((r) => ({
    tenant_id: tenantId,
    name: r.name,
    phone: r.phone,
    address: r.address || null,
    memo: r.memo || null,
    grade: "normal" as const,
    source: "etc" as const,
    imported_from: "csv_contacts",
  }));

  const { data, error } = await supabase
    .from("customers")
    .upsert(inserts, { onConflict: "phone", ignoreDuplicates: true })
    .select("id");

  if (error) return { ok: false, imported: 0, error: error.message };

  revalidatePath("/customers");
  return { ok: true, imported: data?.length ?? 0 };
}
