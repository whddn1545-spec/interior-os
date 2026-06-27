"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  source: "referral" | "online" | "repeat" | "etc";
  memo?: string;
}

const SOURCE_VALUES = ["referral", "online", "repeat", "etc"] as const;
type Source = (typeof SOURCE_VALUES)[number];

// 전화번호를 숫자만 추출 후 010-0000-0000 형식으로 정규화한다.
// 표준 형식으로 맞출 수 없는 번호는 하이픈을 제거한 숫자만 반환한다.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // 휴대전화 (11자리, 010/011/016/017/018/019)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  // 서울 지역번호(02) + 8자리 = 10자리, 또는 휴대전화 구형 10자리
  if (digits.length === 10) {
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 서울 지역번호(02) + 7자리 = 9자리
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }

  return digits;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ ok: boolean; error?: string; customerId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // 이름 검증
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: "이름을 2자 이상 입력해주세요" };
  }

  // 전화번호 검증 및 정규화
  const phoneDigits = input.phone.replace(/\D/g, "");
  if (!phoneDigits) {
    return { ok: false, error: "연락처를 입력해주세요" };
  }
  if (phoneDigits.length < 9 || phoneDigits.length > 11) {
    return { ok: false, error: "연락처를 다시 확인해주세요 (숫자 9~11자리)" };
  }
  const phone = normalizePhone(input.phone);

  // 유입 경로 화이트리스트 검증
  if (!SOURCE_VALUES.includes(input.source as Source)) {
    return { ok: false, error: "유입 경로가 올바르지 않습니다" };
  }
  const source = input.source as Source;

  // 주소: 빈 값은 null로 저장
  const address = input.address?.trim() || null;
  const memo = input.memo?.trim() || null;

  // 동일 tenant 내 전화번호 중복 확인
  const { data: existing, error: dupError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (dupError) return { ok: false, error: dupError.message };
  if (existing) {
    return {
      ok: false,
      error: `이미 등록된 연락처입니다 (${existing.name})`,
    };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      name,
      phone,
      address,
      source,
      grade: "normal" as const,
      memo,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/customers");
  return { ok: true, customerId: data.id };
}
