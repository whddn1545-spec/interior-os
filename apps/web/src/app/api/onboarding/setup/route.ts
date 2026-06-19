import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { businessName, ownerName } = (await request.json()) as { businessName?: string; ownerName?: string };
    if (!businessName?.trim() || !ownerName?.trim()) {
      return NextResponse.json({ error: "상호와 대표자명을 입력해주세요" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    // 테넌트 레코드 생성/업데이트
    const tenantId = user.user_metadata?.tenant_id ?? user.id;

    const { error } = await supabase
      .from("tenants")
      .upsert({
        id: tenantId,
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        plan: "basic" as const,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, tenantId });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
