import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";

const PLAN_NAMES: Record<string, string> = {
  pro: "InteriorOS Pro 월정기결제",
  team: "InteriorOS Team 월정기결제",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { planId, price } = await req.json() as { planId: string; price: number };

  if (!planId || !price || !TOSS_CLIENT_KEY) {
    return NextResponse.json({ error: "결제 설정이 되지 않았습니다. 환경변수를 확인하세요." }, { status: 400 });
  }

  const orderId = `order_${user.id}_${planId}_${Date.now()}`;

  return NextResponse.json({
    clientKey: TOSS_CLIENT_KEY,
    orderId,
    amount: price,
    orderName: PLAN_NAMES[planId] ?? planId,
  });
}
