import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { ContractPdfDocument } from "@/components/pdf/ContractPdfDocument";
import React, { type ReactElement } from "react";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { contractId } = (await request.json()) as { contractId?: string };

    if (!contractId) {
      return NextResponse.json({ error: "contractId가 필요합니다" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const tenantId = (user.user_metadata?.tenant_id as string | undefined)
      ?? (await supabase.from("users").select("tenant_id").eq("id", user.id).single()).data?.tenant_id
      ?? user.id;

    const { data: contract } = await supabase
      .from("contracts")
      .select("*, quotes(*, sites(name, address, area_pyeong, customers(name, phone)), quote_items(*, trades(name_ko)))")
      .eq("id", contractId)
      .single();

    if (!contract) return NextResponse.json({ error: "계약서를 찾을 수 없습니다" }, { status: 404 });

    const c = contract as unknown as Record<string, unknown>;

    const pdfBuffer = await renderToBuffer(
      React.createElement(ContractPdfDocument, { contract: c }) as unknown as ReactElement<DocumentProps>
    );

    const fileName = `${tenantId}/contracts/${contractId}/contract_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signedData, error: signErr } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(fileName, 60 * 60);

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: "서명 URL 생성 실패" }, { status: 500 });
    }

    await supabase.from("contracts").update({ pdf_url: signedData.signedUrl }).eq("id", contractId);

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("Contract PDF generation error:", err);
    return NextResponse.json({ error: "PDF 생성 오류" }, { status: 500 });
  }
}
