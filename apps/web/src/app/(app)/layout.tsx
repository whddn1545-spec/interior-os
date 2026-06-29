import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HomeIcon,
  FileTextIcon,
  CalendarIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";
import { MoreMenu } from "@/components/more-menu";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

// 매일 쓰는 핵심 동선 순서: 홈 → 현장(일정) → 견적 → 고객 → 더보기
// '받을돈'은 홈 화면 '지금 받아야 할 돈' 섹션과 중복이라 탭에서 제외했다.
const tabs = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/schedule", label: "현장", icon: CalendarIcon },
  { href: "/quotes", label: "견적", icon: FileTextIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
];

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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <ul className="flex">
          {tabs.map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-blue-600 active:text-blue-700"
              >
                <Icon size={26} strokeWidth={1.5} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            </li>
          ))}

          <MoreMenu />
        </ul>
      </nav>

      <Toaster position="top-center" richColors toastOptions={{ style: { fontSize: "18px" } }} />
    </div>
  );
}
