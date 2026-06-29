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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 상단 헤더 — 설정 진입점 상시 노출 */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-4 h-14">
        <Link href="/" className="text-lg font-black text-blue-600">
          InteriorOS
        </Link>
        <Link
          href="/settings"
          aria-label="설정"
          className="flex items-center justify-center w-14 h-14 -mr-2 text-gray-500 active:text-blue-700"
        >
          <SettingsIcon size={26} strokeWidth={1.5} />
        </Link>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <BottomNav />

      <Toaster position="top-center" richColors toastOptions={{ style: { fontSize: "18px" } }} />
    </div>
  );
}
