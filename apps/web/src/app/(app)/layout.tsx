import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { OfflineBanner } from "@/components/offline-banner";

async function getHomeBadgeCount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().split("T")[0];

  const [acceptedRes, signedRes, overdueRes, asRes] = await Promise.allSettled([
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .gte("updated_at", sevenDaysAgo),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("status", "signed")
      .gte("updated_at", sevenDaysAgo),
    supabase
      .from("payment_schedules")
      .select("id", { count: "exact", head: true })
      .is("paid_at", null)
      .lt("due_date", today),
    supabase
      .from("as_requests")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed"),
  ]);

  const n = (r: PromiseSettledResult<{ count: number | null }>) =>
    r.status === "fulfilled" ? (r.value.count ?? 0) : 0;

  return n(acceptedRes) + n(signedRes) + n(overdueRes) + n(asRes);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const homeBadge = await getHomeBadgeCount(supabase).catch(() => 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <OfflineBanner />
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-card/85 backdrop-blur-xl saturate-150 border-b border-border/60 px-4 h-14">
        <Link href="/" className="text-lg font-black text-primary">
          InteriorOS
        </Link>
        <Link
          href="/settings"
          aria-label="설정"
          className="flex items-center justify-center w-14 h-14 -mr-2 text-muted-foreground active:text-primary"
        >
          <SettingsIcon size={26} strokeWidth={1.5} />
        </Link>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <BottomNav homeBadge={homeBadge} />

      <Toaster position="top-center" richColors toastOptions={{ style: { fontSize: "18px" } }} />
    </div>
  );
}
