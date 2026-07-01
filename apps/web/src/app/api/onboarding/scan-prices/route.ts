import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanPriceBook } from "@/lib/ai/prompts/scan-prices";
import { getTenantId } from "@/lib/supabase/get-tenant";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const tenantId = await getTenantId(supabase, user);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${tenantId}/onboarding/pricebook_${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    // 1. 임시 스토리지에 사진 업로드
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. 5분짜리 서명 URL 발급
    const { data: signedData, error: signedError } = await supabase.storage
      .from("photos")
      .createSignedUrl(storagePath, 300);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: "URL 생성 실패" }, { status: 500 });
    }

    // 3. 사용 가능한 공종 목록 조회
    const { data: trades } = await supabase.from("trades").select("id, code, name_ko");
    const tradeList = (trades as { id: string; code: string; name_ko: string }[] | null) ?? [];
    const availableTradeCodes = tradeList.map((t) => ({ code: t.code, nameKo: t.name_ko }));
    const tradeByCode = new Map(tradeList.map((t) => [t.code, t.id]));

    // 4. AI에 이미지 스캔 요청
    const scannedItems = await scanPriceBook({
      imageUrl: signedData.signedUrl,
      availableTradeCodes,
      tenantId,
    });

    if (scannedItems.length === 0) {
      return NextResponse.json({ error: "인식된 단가 항목이 없습니다." }, { status: 400 });
    }

    // 5. DB에 인서트
    const inserts = scannedItems.map(item => ({
      tenant_id: tenantId,
      trade_id: tradeByCode.get(item.tradeCode) ?? tradeList[0].id, // fallback to first trade if not found
      item_name: item.itemName,
      material_unit_price: item.materialUnitPrice,
      labor_day_rate: item.laborDayRate,
      default_days_per_unit: item.defaultDaysPerUnit,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from("trade_prices")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: scannedItems.length });
  } catch (e) {
    console.error("Pricebook scan error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
