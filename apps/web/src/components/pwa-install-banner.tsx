"use client";

import { useState, useEffect } from "react";
import { XIcon, SmartphoneIcon } from "lucide-react";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  // 이미 설치된 경우(standalone 모드) 배너 숨김
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  // iOS: iPhone/iPad Safari
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) return "ios";
  // Android Chrome
  if (/android/i.test(ua)) return "android";
  return null;
}

const DISMISSED_KEY = "pwa_banner_dismissed_v1";

export function PwaInstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [dismissed, setDismissed] = useState(true); // 서버 렌더링 중 숨김
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const p = detectPlatform();
    if (!p) return;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(p);
    
    setDismissed(false);

    // Android: beforeinstallprompt 이벤트 저장
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    if (platform === "android" && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    } else if (platform === "ios") {
      setShowIosGuide(true);
    }
  }

  if (dismissed || !platform) return null;

  return (
    <>
      {/* 배너 */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/25 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
            <SmartphoneIcon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground">홈 화면에 추가하면 더 편해요</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {platform === "ios"
                ? "Safari → 공유 버튼 → 홈 화면에 추가"
                : "설치하면 앱처럼 바로 열 수 있어요"}
            </p>
          </div>
          <button onClick={dismiss} className="p-1 text-muted-foreground shrink-0">
            <XIcon size={18} />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full bg-primary text-white rounded-xl py-3 text-base font-bold active:bg-primary/90"
        >
          {platform === "ios" ? "설치 방법 보기" : "홈 화면에 추가하기"}
        </button>
      </div>

      {/* iOS 가이드 바텀시트 */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-foreground">홈 화면에 추가하기</h3>
              <button onClick={() => { setShowIosGuide(false); dismiss(); }} className="p-2 text-muted-foreground">
                <XIcon size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-muted rounded-2xl p-4">
                <span className="text-3xl shrink-0">1️⃣</span>
                <div>
                  <p className="text-base font-bold text-foreground">하단 공유 버튼 탭</p>
                  <p className="text-sm text-muted-foreground">Safari 화면 하단 가운데 아이콘 탭</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-muted rounded-2xl p-4">
                <span className="text-3xl shrink-0">2️⃣</span>
                <div>
                  <p className="text-base font-bold text-foreground">아래로 스크롤</p>
                  <p className="text-sm text-muted-foreground">공유 시트에서 아래로 쓸어 내리기</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-muted rounded-2xl p-4">
                <span className="text-3xl shrink-0">3️⃣</span>
                <div>
                  <p className="text-base font-bold text-foreground">&quot;홈 화면에 추가&quot; 탭</p>
                  <p className="text-sm text-muted-foreground">추가 → 오른쪽 상단 확인 탭</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setShowIosGuide(false); dismiss(); }}
              className="mt-5 w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold"
            >
              알겠어요 ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
