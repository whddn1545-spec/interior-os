import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL("/pricing?error=invalid", req.url));
  }

  try {
    // 토스페이먼츠 결제 승인
    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    if (!confirmRes.ok) {
      const err = await confirmRes.json() as { message?: string };
      throw new Error(err.message ?? "결제 승인 실패");
    }

    // orderId에서 planId 추출 (order_{userId}_{planId}_{timestamp})
    const parts = orderId.split("_");
    const planId = parts[2] ?? "pro";

    // 테넌트 플랜 업데이트
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const tenantId = user.user_metadata?.tenant_id ?? user.id;
      await supabase
        .from("tenants")
        .update({ plan: planId as "basic" | "pro" | "team" })
        .eq("id", tenantId);
    }

    return NextResponse.redirect(new URL("/settings?payment=success", req.url));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/pricing?error=${encodeURIComponent((e as Error).message)}`, req.url)
    );
  }
}
