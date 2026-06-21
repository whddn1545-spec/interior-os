import Link from "next/link";
import {
  HomeIcon,
  FileTextIcon,
  CalendarIcon,
  MessageSquareIcon,
  UsersIcon,
  WrenchIcon,
  DollarSignIcon,
  CameraIcon,
  ImageIcon,
  CalculatorIcon,
  SparklesIcon,
  MoreHorizontalIcon,
} from "lucide-react";

const tabs = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/quotes", label: "견적", icon: FileTextIcon },
  { href: "/schedule", label: "일정", icon: CalendarIcon },
  { href: "/messages", label: "문자", icon: MessageSquareIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
];

const moreMenuItems = [
  { href: "/workers", label: "작업자", icon: WrenchIcon },
  { href: "/finance", label: "매출", icon: DollarSignIcon },
  { href: "/photos", label: "사진", icon: CameraIcon },
  { href: "/instagram", label: "인스타", icon: ImageIcon },
  { href: "/materials", label: "자재산출", icon: CalculatorIcon },
  { href: "/moodboard", label: "무드보드", icon: SparklesIcon },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
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

          {/* 더보기 드롭업 */}
          <li className="flex-1 relative group">
            <button className="w-full flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-blue-600">
              <MoreHorizontalIcon size={26} strokeWidth={1.5} />
              <span className="text-xs font-medium">더보기</span>
            </button>

            {/* 드롭업 메뉴 */}
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden hidden group-focus-within:block group-hover:block w-40">
              {moreMenuItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 text-base text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <Icon size={20} className="text-gray-500 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
