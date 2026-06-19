import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { SchedulePdfDocument } from "@/components/pdf/SchedulePdfDocument";
import React, { type ReactElement } from "react";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const { data: site } = await supabase
      .from("sites")
      .select("id, name, address, start_date, end_date, customers(name)")
      .eq("id", siteId)
      .single();

    if (!site) return NextResponse.json({ error: "현장을 찾을 수 없습니다" }, { status: 404 });

    const { data: tasks } = await supabase
      .from("schedule_tasks")
      .select("id, title, start_date, end_date, duration_days, kind, status, trades(name_ko)")
      .eq("site_id", siteId)
      .order("start_date", { ascending: true });

    const siteData = site as unknown as Record<string, unknown>;
    const taskList = (tasks as unknown as Record<string, unknown>[]) ?? [];

    const pdfBuffer = await renderToBuffer(
      React.createElement(SchedulePdfDocument, { site: siteData, tasks: taskList }) as unknown as ReactElement<DocumentProps>
    );

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="schedule_${siteId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Schedule PDF error:", err);
    return NextResponse.json({ error: "PDF 생성 오류" }, { status: 500 });
  }
}
