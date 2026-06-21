import Link from "next/link";
import { ChevronRightIcon, TagIcon, MapPinIcon, SmartphoneIcon, CreditCardIcon, LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  { href: "/settings/prices", icon: TagIcon, label: "단가표", desc: "공종별 자재비·인건비 단가" },
  { href: "/settings/factors", icon: MapPinIcon, label: "거리·난이도 계수", desc: "견적 계수 설정" },
  { href: "/pricing", icon: CreditCardIcon, label: "요금제 업그레이드", desc: "Pro/Team 플랜으로 더 많은 기능" },
  { href: "/settings/pwa", icon: SmartphoneIcon, label: "홈 화면에 추가", desc: "태블릿·폰 홈에 설치하기" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, owner_name, plan")
    .eq("id", user?.user_metadata?.tenant_id ?? user?.id ?? "")
    .maybeSingle();

  const t = tenant as { business_name: string; owner_name: string; plan: string } | null;

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>

      {/* 사업자 정보 */}
      {t && (
        <div className="bg-blue-600 rounded-2xl px-4 py-5 mb-6 text-white">
          <p className="text-xl font-bold">{t.business_name}</p>
          <p className="text-blue-200 mt-0.5">{t.owner_name} 대표 · {t.plan === "basic" ? "기본 요금제" : t.plan}</p>
        </div>
      )}

      {/* 메뉴 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        {MENU.map(({ href, icon: Icon, label, desc }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 ${
              i < MENU.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900">{label}</p>
              <p className="text-sm text-gray-500 truncate">{desc}</p>
            </div>
            <ChevronRightIcon size={18} className="text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-4 px-4 py-4 text-red-600 hover:bg-red-50"
          >
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <LogOutIcon size={20} className="text-red-500" />
            </div>
            <span className="text-base font-semibold">로그아웃</span>
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">InteriorOS v1.0 — Phase 1</p>
    </div>
  );
}
