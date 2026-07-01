import Link from "next/link";
import { ChevronRightIcon, TagIcon, MapPinIcon, SmartphoneIcon, CreditCardIcon, LogOutIcon, HardHatIcon, CalculatorIcon, SparklesIcon, HelpCircleIcon, ZapIcon, CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusinessInfoCard } from "./business-info-form";

const MENU = [
  { href: "/settings/prices", icon: TagIcon, label: "단가표", desc: "공종별 자재비·인건비 단가" },
  { href: "/settings/factors", icon: MapPinIcon, label: "거리·난이도 계수", desc: "견적 계수 설정" },
  { href: "/materials?from=settings", icon: CalculatorIcon, label: "자재 산출", desc: "면적으로 자재 물량 계산하기" },
  { href: "/moodboard?from=settings", icon: SparklesIcon, label: "AI 시각화", desc: "사진으로 완성 모습 미리보기" },
  { href: "/workers", icon: HardHatIcon, label: "작업자 관리", desc: "작업자 명단·연락처·평점" },
  { href: "/pricing", icon: CreditCardIcon, label: "요금제 업그레이드", desc: "Pro/Team 플랜으로 더 많은 기능" },
  { href: "/settings/pwa", icon: SmartphoneIcon, label: "홈 화면에 추가", desc: "태블릿·폰 홈에 설치하기" },
  { href: "/help", icon: HelpCircleIcon, label: "도움말", desc: "사용법·따라하기 안내 보기" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
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
      <h1 className="text-2xl font-bold text-foreground mb-6">설정</h1>

      {/* 결제 성공 배너 */}
      {payment === "success" && (
        <div className="bg-profit/10 border border-profit/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <CheckIcon size={20} className="text-profit shrink-0" />
          <div>
            <p className="text-base font-bold text-foreground">Pro 업그레이드 완료! 🎉</p>
            <p className="text-sm text-muted-foreground">모든 AI 기능을 무제한으로 사용할 수 있어요</p>
          </div>
        </div>
      )}

      {/* 사업자 정보 (누르면 수정) */}
      {t && (
        <BusinessInfoCard
          businessName={t.business_name}
          ownerName={t.owner_name}
          plan={t.plan}
        />
      )}

      {/* Basic 플랜 업그레이드 배너 */}
      {t?.plan === "basic" && (
        <Link
          href="/pricing"
          className="block bg-primary rounded-2xl p-4 mb-5 text-primary-foreground active:bg-primary/90"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center shrink-0">
              <ZapIcon size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold">Pro로 업그레이드</p>
              <p className="text-sm text-primary-foreground/80">AI 기능 무제한 · ₩39,000/월</p>
            </div>
            <div className="shrink-0">
              <span className="bg-primary-foreground/20 text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-xl">
                시작 →
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {["통화 문서화", "완공 리포트", "점검 문자", "무제한 기능"].map((f) => (
              <span key={f} className="flex items-center gap-1 text-xs text-primary-foreground/80">
                <CheckIcon size={10} />
                {f}
              </span>
            ))}
          </div>
        </Link>
      )}

      {/* 메뉴 */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
        {MENU.map(({ href, icon: Icon, label, desc }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-4 py-4 active:bg-muted ${
              i < MENU.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRightIcon size={18} className="text-muted-foreground/50 shrink-0" />
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-4 px-4 py-4 text-loss active:bg-loss/10"
          >
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <LogOutIcon size={20} className="text-red-500" />
            </div>
            <span className="text-base font-semibold">로그아웃</span>
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground/70 mt-8">InteriorOS v1.0</p>
    </div>
  );
}
