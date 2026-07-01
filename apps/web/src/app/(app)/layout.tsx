import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-col min-h-screen bg-background">
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

      <BottomNav />

      <Toaster position="top-center" richColors toastOptions={{ style: { fontSize: "18px" } }} />
    </div>
  );
}
