import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background/50 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center fixed inset-0 z-50">
      <div className="relative w-24 h-24 mb-6">
        {/* 애니메이션 원형 글로우 */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        
        {/* 메인 스피너 */}
        <div className="absolute inset-0 flex items-center justify-center bg-card border border-border rounded-3xl shadow-xl">
          <Loader2Icon size={40} className="text-primary animate-spin" />
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-foreground mb-2">데이터를 불러오는 중입니다</h2>
      <p className="text-sm text-muted-foreground animate-pulse">잠시만 기다려주세요...</p>
    </div>
  );
}
