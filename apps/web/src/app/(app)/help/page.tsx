import Link from "next/link";
import { ChevronRightIcon, ArrowLeftIcon } from "lucide-react";
import { TUTORIAL_CONTENT, type TutorialKey } from "@/lib/tutorial/tutorial-content";

const PAGE_LINKS: Partial<Record<TutorialKey, string>> = {
  home: "/",
  quote_wizard: "/quotes/new",
  payments: "/payments",
  workers: "/workers",
  messages: "/messages",
  photos: "/photos",
  schedule: "/schedule",
  finance: "/finance",
  contracts: "/quotes",
};

const PAGE_LINK_LABEL: Partial<Record<TutorialKey, string>> = {
  home: "홈 화면 보기",
  quote_wizard: "견적 만들기",
  payments: "받을 돈 보기",
  workers: "작업자 보기",
  messages: "문자 보내기",
  photos: "사진 보기",
  schedule: "일정 보기",
  finance: "장부 보기",
  contracts: "견적 목록 보기",
};

export default function HelpCenterPage() {
  const keys = Object.keys(TUTORIAL_CONTENT) as TutorialKey[];

  return (
    <div className="pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">도움말</h1>
      </header>

      <div className="px-4 pt-6 space-y-6">
      <p className="text-lg text-gray-500">궁금한 메뉴를 눌러보세요</p>

      {/* 빠른 이동 */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">바로 이동</h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { href: "/quotes/new", emoji: "📄", label: "새 견적 만들기" },
              { href: "/messages", emoji: "✉️", label: "문자 보내기" },
              { href: "/payments", emoji: "💰", label: "받을 돈 확인" },
              { href: "/schedule", emoji: "📅", label: "공사 일정" },
              { href: "/workers", emoji: "👷", label: "작업자 관리" },
              { href: "/finance", emoji: "📒", label: "수입·지출 장부" },
            ] as const
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 active:bg-gray-50"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-base font-semibold text-gray-800 flex-1">{item.label}</span>
              <ChevronRightIcon size={16} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* 사용법 */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">사용법 안내</h2>
        <div className="space-y-3">
          {keys.map((key) => {
            const content = TUTORIAL_CONTENT[key];
            const pageLink = PAGE_LINKS[key];
            const pageLinkLabel = PAGE_LINK_LABEL[key];
            return (
              <details
                key={key}
                className="bg-white border border-gray-200 rounded-2xl px-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center gap-3 py-4 cursor-pointer text-lg font-bold text-gray-900 list-none">
                  <span className="text-2xl">{content.icon}</span>
                  <span>{content.title}</span>
                  <span className="ml-auto text-gray-400 text-base">자세히 ▼</span>
                </summary>
                <div className="pb-4 space-y-3">
                  {content.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 bg-gray-50 rounded-2xl px-4 py-4"
                    >
                      <span className="text-3xl leading-none shrink-0">{step.icon}</span>
                      <p className="text-lg text-gray-800 leading-snug">{step.text}</p>
                    </div>
                  ))}
                  {pageLink && pageLinkLabel && (
                    <Link
                      href={pageLink}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-4 text-lg font-bold mt-2 active:bg-blue-700"
                    >
                      {pageLinkLabel}
                      <ChevronRightIcon size={20} />
                    </Link>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 문의 */}
      <section className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-5 text-center">
        <p className="text-lg font-bold text-gray-800 mb-1">더 궁금한 게 있으신가요?</p>
        <p className="text-base text-gray-500">앱을 사용하다 막히면 언제든 물어보세요</p>
      </section>
      </div>
    </div>
  );
}
