"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type OS = "ios" | "android" | "desktop" | "unknown";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows|Mac|Linux/.test(ua)) return "desktop";
  return "unknown";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

export default function PwaGuidePage() {
  const [os, setOs] = useState<OS>("unknown");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setOs(detectOS());
    setInstalled(isStandalone());
  }, []);

  if (installed) {
    return (
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="p-3 -ml-3 text-gray-600">
            <ArrowLeftIcon size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">홈 화면에 추가</h1>
        </div>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">이미 설치되어 있어요!</h2>
          <p className="text-gray-500">홈 화면에서 InteriorOS 아이콘을 탭해서 실행하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-3 -ml-3 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">홈 화면에 추가</h1>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-6">
        <p className="text-base font-semibold text-blue-800 mb-1">앱처럼 사용하는 방법</p>
        <p className="text-sm text-blue-600">
          홈 화면에 추가하면 앱처럼 전체화면으로 열려요.<br />
          인터넷 없이도 일부 기능을 사용할 수 있어요.
        </p>
      </div>

      {(os === "ios") && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">iPhone / iPad (Safari)</h2>
          <ol className="space-y-4">
            {[
              { step: 1, icon: "🌐", text: "Safari 브라우저로 이 페이지를 열어주세요" },
              { step: 2, icon: "⬆️", text: "화면 하단 가운데 '공유' 버튼을 누르세요" },
              { step: 3, icon: "➕", text: "'홈 화면에 추가'를 찾아서 탭하세요" },
              { step: 4, icon: "✅", text: "오른쪽 위 '추가'를 누르면 완료!" },
            ].map(({ step, icon, text }) => (
              <li key={step} className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-base font-bold shrink-0">
                  {step}
                </span>
                <div>
                  <span className="text-2xl mr-2">{icon}</span>
                  <span className="text-base text-gray-800">{text}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
            <p className="text-sm text-amber-700">
              ⚠️ Safari가 아닌 다른 브라우저(크롬 등)에서는 '홈 화면에 추가'가 안 보일 수 있어요.
              반드시 Safari로 접속해주세요.
            </p>
          </div>
        </div>
      )}

      {(os === "android") && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Android (Chrome)</h2>
          <ol className="space-y-4">
            {[
              { step: 1, icon: "🌐", text: "Chrome 브라우저로 이 페이지를 열어주세요" },
              { step: 2, icon: "⋮", text: "오른쪽 위 메뉴(점 세 개)를 누르세요" },
              { step: 3, icon: "📱", text: "'홈 화면에 추가' 또는 '앱 설치'를 누르세요" },
              { step: 4, icon: "✅", text: "'추가' 또는 '설치'를 눌러 완료!" },
            ].map(({ step, icon, text }) => (
              <li key={step} className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-base font-bold shrink-0">
                  {step}
                </span>
                <div>
                  <span className="text-2xl mr-2">{icon}</span>
                  <span className="text-base text-gray-800">{text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(os === "desktop" || os === "unknown") && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">PC / Mac (Chrome / Edge)</h2>
          <ol className="space-y-4">
            {[
              { step: 1, icon: "🌐", text: "Chrome 또는 Edge 브라우저를 사용해주세요" },
              { step: 2, icon: "⊕", text: "주소창 오른쪽 끝 설치 아이콘(⊕)을 누르세요" },
              { step: 3, icon: "✅", text: "'설치'를 눌러 완료!" },
            ].map(({ step, icon, text }) => (
              <li key={step} className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-base font-bold shrink-0">
                  {step}
                </span>
                <div>
                  <span className="text-2xl mr-2">{icon}</span>
                  <span className="text-base text-gray-800">{text}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-gray-500 mt-2">
            태블릿·스마트폰에서 접속하면 더 자세한 안내가 나와요.
          </p>
        </div>
      )}
    </div>
  );
}
