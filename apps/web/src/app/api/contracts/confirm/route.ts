import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { contractId } = (await request.json()) as { contractId?: string };
    if (!contractId) {
      return NextResponse.json({ error: "contractId가 필요합니다" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const { error } = await supabase
      .from("contracts")
      .update({
        status: "confirmed" as const,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("status", "draft" as const);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
