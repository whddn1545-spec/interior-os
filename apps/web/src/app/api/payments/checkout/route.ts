import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantId } from "@/lib/supabase/get-tenant";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

// 서버 측 플랜 가격 정의 — 클라이언트에서 받은 price는 무시
const PLAN_PRICES: Record<string, number> = {
  pro: 39000,
  team: 79000,
};

const PLAN_NAMES: Record<string, string> = {
  pro: "InteriorOS Pro 월정기결제",
  team: "InteriorOS Team 월정기결제",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { planId } = (await req.json()) as { planId: string };

  const price = PLAN_PRICES[planId];
  if (!price || !TOSS_CLIENT_KEY) {
    return NextResponse.json(
      { error: "유효하지 않은 플랜이거나 결제 설정이 없습니다" },
      { status: 400 }
    );
  }

  const orderId = `order_${user.id}_${planId}_${Date.now()}`;
  const tenantId = await getTenantId(supabase, user);

  // 결제 시도 기록 (멱등성 + success 라우트에서 planId/amount 검증용)
  const admin = createAdminClient();
  const { error: recordError } = await admin.from("payment_records").insert({
    tenant_id: tenantId,
    user_id: user.id,
    order_id: orderId,
    plan_id: planId as "pro" | "team",
    amount: price,
    status: "pending",
  });

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 500 });
  }

  return NextResponse.json({
    clientKey: TOSS_CLIENT_KEY,
    orderId,
    amount: price,
    orderName: PLAN_NAMES[planId],
  });
}
