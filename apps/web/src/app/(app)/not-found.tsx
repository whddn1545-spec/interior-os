import Link from "next/link";
import { SearchXIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="px-4 pt-16 pb-24 flex flex-col items-center text-center">
      <SearchXIcon size={56} className="text-muted-foreground/70 mb-4" />
      <h2 className="text-2xl font-bold text-foreground mb-2">찾는 화면이 없어요</h2>
      <p className="text-lg text-muted-foreground mb-8">
        삭제되었거나 잘못된 주소예요.
        <br />
        아래 버튼을 눌러 처음 화면으로 가세요.
      </p>
      <Link
        href="/"
        className="bg-primary text-white text-xl font-bold rounded-2xl px-10 py-5 active:bg-primary/90"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
