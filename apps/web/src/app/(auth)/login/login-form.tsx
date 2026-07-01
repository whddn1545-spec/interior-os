"use client";

import { useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [sent, setSent] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function handleSubmit() {
    if (!email.trim()) { setError("이메일을 입력해주세요"); return; }
    if (!password.trim()) { setError("비밀번호를 입력해주세요"); return; }

    startTransition(async () => {
      setError(null);
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError("이메일 또는 비밀번호가 맞지 않아요");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (authError) {
          setError(authError.message);
        } else {
          setSent(true);
        }
      }
    });
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="text-6xl mb-6">📧</div>
          <h1 className="text-3xl font-black text-foreground mb-3">이메일을 확인해주세요</h1>
          <p className="text-lg text-muted-foreground">
            {email}로 인증 링크를 보냈어요.<br />
            링크를 클릭하면 바로 시작할 수 있어요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-5xl font-black text-blue-600 mb-2">InteriorOS</p>
          <p className="text-lg text-muted-foreground">인테리어 업무 자동화</p>
        </div>

        <div className="flex bg-muted rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${
              mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${
              mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            회원가입
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-foreground mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-foreground mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full border border-border rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 mt-2"
          >
            {isPending
              ? mode === "login" ? "로그인 중..." : "가입 중..."
              : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          인테리어 자영업자를 위한 AI 업무 도구
        </p>
      </div>
    </div>
  );
}
