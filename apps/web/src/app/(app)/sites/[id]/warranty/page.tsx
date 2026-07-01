import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WarrantyClient } from "./warranty-client";

export const dynamic = "force-dynamic";

export default async function WarrantyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: site }, { data: requests }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, status, end_date, tenant_id, customer_id, customers(id, name, phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("as_requests")
      .select("id, title, description, status, warranty_type, created_at")
      .eq("site_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!site) notFound();

  const siteAny = site as unknown as {
    id: string; name: string; status: string; end_date: string | null;
    tenant_id: string; customer_id: string | null;
    customers: { id: string; name: string; phone: string } | null;
  };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name")
    .eq("id", siteAny.tenant_id)
    .single();

  const customer = siteAny.customers;
  const businessName = (tenant as unknown as { business_name: string } | null)?.business_name ?? "";

  const openCount = (requests ?? []).filter(
    (r) => (r as unknown as { status: string }).status !== "closed"
  ).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href={`/sites/${id}`} className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">A/S 보증 관리</h1>
          <p className="text-sm text-muted-foreground truncate">{siteAny.name}</p>
        </div>
        {openCount > 0 && (
          <span className="bg-warning text-warning-foreground text-sm font-bold px-3 py-1 rounded-full">
            {openCount}건
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* 보증 기간 배너 */}
        {siteAny.end_date && (
          <div className="bg-profit/8 border border-profit/20 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheckIcon size={22} className="text-profit shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-foreground">무상 보증 기간 안내</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                공사 완료일 기준 1년 (
                {new Date(siteAny.end_date).toLocaleDateString("ko-KR", {
                  year: "numeric", month: "long", day: "numeric",
                })}
                ~{" "}
                {new Date(
                  new Date(siteAny.end_date).getTime() + 365 * 24 * 60 * 60 * 1000
                ).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                )
              </p>
            </div>
          </div>
        )}

        <WarrantyClient
          siteId={id}
          customerId={siteAny.customer_id}
          customerName={customer?.name ?? null}
          customerPhone={customer?.phone ?? null}
          siteName={siteAny.name}
          endDate={siteAny.end_date}
          businessName={businessName}
          initialRequests={(requests ?? []) as unknown as Parameters<typeof WarrantyClient>[0]["initialRequests"]}
        />
      </div>
    </div>
  );
}
