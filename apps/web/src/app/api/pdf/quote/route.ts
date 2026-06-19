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

    // Supabase Storage 업로드
    const fileName = `quotes/${quoteId}/${audience}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF 생성 오류" }, { status: 500 });
  }
}
