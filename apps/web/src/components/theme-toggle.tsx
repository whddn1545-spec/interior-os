"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-4 px-4 py-4 border-t border-border">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 animate-pulse" />
        <div className="flex-1">
          <div className="h-5 bg-muted rounded w-24 mb-1" />
          <div className="h-4 bg-muted rounded w-40" />
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full flex items-center gap-4 px-4 py-4 border-t border-border active:bg-muted text-left"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
        {isDark ? (
          <MoonIcon size={20} className="text-primary" />
        ) : (
          <SunIcon size={20} className="text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-foreground">
          {isDark ? "다크 모드 해제" : "다크 모드 켜기"}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {isDark ? "눈이 편안한 어두운 화면을 사용 중이에요" : "화면을 어둡게 설정하여 눈을 보호해요"}
        </p>
      </div>
    </button>
  );
}
