import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/components/pdf/QuotePdfDocument";
import React, { type ReactElement } from "react";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { quoteId, audience } = (await request.json()) as {
      quoteId?: string;
      audience?: "customer" | "internal";
    };

    if (!quoteId || !audience) {
      return NextResponse.json({ error: "quoteId와 audience가 필요합니다" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const tenantId = (user.user_metadata?.tenant_id as string | undefined)
      ?? (await supabase.from("users").select("tenant_id").eq("id", user.id).single()).data?.tenant_id
      ?? user.id;

    const { data: quote } = await supabase
      .from("quotes")
      .select("*, sites(name, address, area_pyeong, customers(name, phone)), quote_items(*, trades(name_ko))")
      .eq("id", quoteId)
      .single();

    if (!quote) return NextResponse.json({ error: "견적을 찾을 수 없습니다" }, { status: 404 });

    const q = quote as unknown as Record<string, unknown>;

    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotePdfDocument, { quote: q, audience }) as unknown as ReactElement<DocumentProps>
    );

    // Supabase Storage 업로드 (tenantId prefix로 RLS 통과)
    const fileName = `${tenantId}/quotes/${quoteId}/${audience}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // PDF는 서명 URL (1시간 유효)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(fileName, 60 * 60);

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: "서명 URL 생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF 생성 오류" }, { status: 500 });
  }
}
