import Link from "next/link";
import { PlusIcon, FileTextIcon, CalendarIcon } from "lucide-react";

export default function HomePage() {
  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">안녕하세요 👋</h1>
      <p className="text-lg text-gray-500 mb-8">오늘 할 일을 확인하세요</p>

      {/* 빠른 액션 */}
      <section className="mb-8">
        <Link
          href="/quotes/new"
          className="flex items-center gap-3 w-full bg-blue-600 text-white rounded-2xl px-6 py-5 text-xl font-semibold shadow-sm active:bg-blue-700"
        >
          <PlusIcon size={28} />
          새 견적 만들기
        </Link>
      </section>

      {/* 진행 중인 현장 */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">진행 중인 현장</h2>
        <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
          <CalendarIcon size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-lg">진행 중인 현장이 없어요</p>
        </div>
      </section>

      {/* 확인 대기 견적 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-3">확인 대기 중인 견적</h2>
        <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
          <FileTextIcon size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-lg">대기 중인 견적이 없어요</p>
        </div>
      </section>
    </div>
  );
}
