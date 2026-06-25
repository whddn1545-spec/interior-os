import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { businessName, ownerName } = (await request.json()) as {
      businessName?: string;
      ownerName?: string;
    };
    if (!businessName?.trim() || !ownerName?.trim()) {
      return NextResponse.json(
        { error: "상호와 대표자명을 입력해주세요" },
        { status: 400 }
      );
    }

    // 인증된 사용자 확인 (anon 클라이언트로 세션 검증)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // service_role로 tenant + user 행 생성 (RLS 우회 — 초기 셋업이라 JWT에 tenant_id 미주입 상태)
    const admin = createAdminClient();

    // 1) tenants 행 upsert
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .upsert(
        {
          id: user.id, // tenantId = userId (1인 사업자 기본값)
          business_name: businessName.trim(),
          owner_name: ownerName.trim(),
          plan: "basic" as const,
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    const tenantId = tenant.id;

    // 2) users 행 upsert (hook이 JWT에 tenant_id를 주입하려면 이 행이 필요)
    const { error: userError } = await admin.from("users").upsert(
      {
        id: user.id,
        tenant_id: tenantId,
        role: "owner" as const,
        display_name: ownerName.trim(),
      },
      { onConflict: "id" }
    );

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 3) 기본 거리구역 시드 (이미 있으면 skip)
    const { count } = await admin
      .from("distance_zones")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (!count || count === 0) {
      await admin.from("distance_zones").insert([
        { tenant_id: tenantId, name: "근거리 (30분 이내)", distance_factor: 1.0 },
        { tenant_id: tenantId, name: "중거리 (1시간 이내)", distance_factor: 1.1 },
        { tenant_id: tenantId, name: "원거리 (1시간 초과)", distance_factor: 1.2 },
      ]);
    }

    // 4) onboarding 완료 표시 (proxy에서 게이트 체크용)
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, onboarded: true, tenant_id: tenantId },
    });

    return NextResponse.json({ ok: true, tenantId });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
