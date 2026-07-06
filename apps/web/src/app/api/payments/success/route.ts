import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL("/pricing?error=invalid", req.url));
  }

  const admin = createAdminClient();

  try {
    // 1) 서버에 저장된 결제 레코드로 planId·amount 검증 (클라이언트 조작 방지)
    const { data: record, error: recordError } = await admin
      .from("payment_records")
      .select("id, tenant_id, user_id, plan_id, amount, status")
      .eq("order_id", orderId)
      .single();

    if (recordError || !record) {
      return NextResponse.redirect(new URL("/pricing?error=order_not_found", req.url));
    }
    if (record.status === "confirmed") {
      // 이미 처리된 결제 — 멱등 처리
      return NextResponse.redirect(new URL("/settings?payment=success", req.url));
    }
    if (Number(amount) !== record.amount) {
      // 금액 불일치 — 조작 시도
      await admin
        .from("payment_records")
        .update({ status: "failed" })
        .eq("id", record.id);
      return NextResponse.redirect(new URL("/pricing?error=amount_mismatch", req.url));
    }

    // 1.5) 동시 중복 콜백 방어 — payment_key(초기 NULL)를 원자적으로 선점.
    //      영향 행 0 = 다른 요청이 이미 선점 → 멱등 종료(이중 승인·이중 플랜업 차단).
    const { data: claimed } = await admin
      .from("payment_records")
      .update({ payment_key: paymentKey })
      .eq("id", record.id)
      .is("payment_key", null)
      .select("id");

    if (!claimed || claimed.length === 0) {
      return NextResponse.redirect(new URL("/settings?payment=success", req.url));
    }

    // 2) 토스 결제 승인 (서버 검증 완료 후)
    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: record.amount }),
    });

    if (!confirmRes.ok) {
      const err = (await confirmRes.json()) as { message?: string };
      await admin
        .from("payment_records")
        .update({ status: "failed", payment_key: null })
        .eq("id", record.id);
      throw new Error(err.message ?? "결제 승인 실패");
    }

    // 3) 세션 없이 service_role로 플랜 업데이트 (C-3 수정)
    await Promise.all([
      admin
        .from("tenants")
        .update({ plan: record.plan_id as "pro" | "team" })
        .eq("id", record.tenant_id),
      admin
        .from("payment_records")
        .update({ status: "confirmed" })
        .eq("id", record.id),
    ]);

    return NextResponse.redirect(new URL("/settings?payment=success", req.url));
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/pricing?error=${encodeURIComponent((e as Error).message)}`,
        req.url
      )
    );
  }
}
