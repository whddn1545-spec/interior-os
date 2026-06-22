import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HomeIcon,
  FileTextIcon,
  CalendarIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";
import { MoreMenu } from "@/components/more-menu";
import { createClient } from "@/lib/supabase/server";

const tabs = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/quotes", label: "견적", icon: FileTextIcon },
  { href: "/schedule", label: "일정", icon: CalendarIcon },
  { href: "/messages", label: "문자", icon: MessageSquareIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
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

          <MoreMenu />
        </ul>
      </nav>
    </div>
  );
}
