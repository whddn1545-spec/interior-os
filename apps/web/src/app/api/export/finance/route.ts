import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 세무사 전달용 장부 내보내기 — 월별 입출금 내역 CSV.
// UTF-8 BOM을 붙여 한국어 엑셀에서 바로 열린다. RLS로 테넌트 격리.

const CATEGORY_LABEL: Record<string, string> = {
  customer_payment: "고객 입금",
  material: "자재비",
  labor: "인건비",
  outsourcing: "외주비",
  etc: "기타",
};

/** CSV 필드 이스케이프 — 콤마/따옴표/줄바꿈 포함 시 따옴표로 감싼다 */
function csvField(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

type EntryRow = {
  paid_at: string;
  direction: "in" | "out";
  category: string;
  counterparty: string | null;
  amount: number;
  memo: string | null;
  sites: { name?: string } | { name?: string }[] | null;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const monthParam = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "month 형식은 YYYY-MM 입니다" }, { status: 400 });
  }

  const [y, m] = monthParam.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().split("T")[0];
  const end = new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("finance_entries")
    .select("paid_at, direction, category, counterparty, amount, memo, sites(name)")
    .gte("paid_at", start)
    .lt("paid_at", end)
    .order("paid_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as EntryRow[];

  const header = ["날짜", "구분", "항목", "거래처", "현장", "금액(원)", "메모"];
  const lines = [header.join(",")];

  let totalIn = 0;
  let totalOut = 0;

  for (const r of rows) {
    const site = Array.isArray(r.sites) ? r.sites[0] : r.sites;
    const amount = Number(r.amount ?? 0);
    if (r.direction === "in") totalIn += amount;
    else totalOut += amount;

    lines.push(
      [
        csvField(r.paid_at),
        r.direction === "in" ? "입금" : "지출",
        csvField(CATEGORY_LABEL[r.category] ?? r.category),
        csvField(r.counterparty),
        csvField(site?.name ?? ""),
        amount,
        csvField(r.memo),
      ].join(",")
    );
  }

  // 하단 합계 — 세무사가 검산하기 쉽게
  lines.push("");
  lines.push(["합계(입금)", "", "", "", "", totalIn, ""].join(","));
  lines.push(["합계(지출)", "", "", "", "", totalOut, ""].join(","));
  lines.push(["순이익", "", "", "", "", totalIn - totalOut, ""].join(","));

  // UTF-8 BOM — 한국어 엑셀 호환
  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `장부_${monthParam}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger_${monthParam}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
