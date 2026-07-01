import Link from "next/link";
import { SearchXIcon, HomeIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mb-8">
        <SearchXIcon size={40} className="text-muted-foreground" />
      </div>
      
      <h1 className="text-3xl font-black text-foreground mb-4">페이지를 찾을 수 없어요</h1>
      <p className="text-lg text-muted-foreground mb-12 max-w-sm">
        요청하신 페이지의 주소가 잘못되었거나, 지금은 삭제된 페이지 같아요.
      </p>

      <div className="w-full max-w-xs">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-2xl py-5 text-xl font-bold active:scale-[0.98] transition-transform shadow-primary-glow"
        >
          <HomeIcon size={24} />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
