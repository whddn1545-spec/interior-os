"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, SparklesIcon, DownloadIcon } from "lucide-react";
import { generateMoodboard } from "./actions";

const SPACE_TYPES = [
  { value: "living room", label: "거실" },
  { value: "bedroom", label: "침실" },
  { value: "kitchen", label: "주방" },
  { value: "bathroom", label: "욕실" },
  { value: "whole apartment", label: "전체" },
];

const STYLES = [
  { value: "modern minimalist", label: "모던 미니멀" },
  { value: "Scandinavian", label: "북유럽" },
  { value: "classic luxury", label: "클래식 고급" },
  { value: "industrial", label: "인더스트리얼" },
  { value: "natural wood", label: "내추럴 우드" },
];

const COLOR_OPTIONS = [
  { value: "white and light gray", label: "흰색/연회색" },
  { value: "beige and warm tones", label: "베이지/따뜻한 톤" },
  { value: "dark gray and black", label: "다크그레이/블랙" },
  { value: "blue and navy", label: "블루/네이비" },
  { value: "wood tones", label: "우드 톤" },
  { value: "green and earth tones", label: "그린/어스 톤" },
];

const AREA_OPTIONS = [
  { value: "20 pyeong (66㎡)", label: "20평" },
  { value: "30 pyeong (99㎡)", label: "30평" },
  { value: "40 pyeong (132㎡)", label: "40평" },
  { value: "50 pyeong or more", label: "50평 이상" },
];

export default function MoodboardPage() {
  const [spaceType, setSpaceType] = useState(SPACE_TYPES[0].value);
  const [style, setStyle] = useState(STYLES[0].value);
  const [selectedColors, setSelectedColors] = useState<string[]>([COLOR_OPTIONS[0].value]);
  const [area, setArea] = useState(AREA_OPTIONS[1].value);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleColor(val: string) {
    setSelectedColors((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val].slice(-3)
    );
  }

  function handleGenerate() {
    if (selectedColors.length === 0) return;
    startTransition(async () => {
      setError(null);
      setImageUrl(null);
      const result = await generateMoodboard({ spaceType, style, colors: selectedColors, area });
      if (result.ok) {
        setImageUrl(result.imageUrl ?? null);
      } else {
        setError(result.error ?? "생성 실패");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">인테리어 무드보드</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-800">
          AI가 고객에게 보여줄 인테리어 무드보드를 만들어드려요.<br />
          <strong>참고용 이미지</strong>이며 실제 시공 결과와 다를 수 있어요.
        </div>

        {/* 공간 유형 */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">공간</label>
          <div className="grid grid-cols-3 gap-2">
            {SPACE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSpaceType(value)}
                className={`py-3 rounded-xl text-base font-semibold transition-colors ${
                  spaceType === value ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 스타일 */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">스타일</label>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStyle(value)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  style === value ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 (최대 3개) */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            색상 <span className="text-sm font-normal text-gray-500">(최대 3개)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleColor(value)}
                className={`py-2.5 rounded-xl text-base font-semibold transition-colors ${
                  selectedColors.includes(value)
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 평수 */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">평수</label>
          <div className="grid grid-cols-4 gap-2">
            {AREA_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setArea(value)}
                className={`py-3 rounded-xl text-base font-semibold transition-colors ${
                  area === value ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending || selectedColors.length === 0}
          className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white rounded-xl text-lg font-bold disabled:opacity-50"
        >
          <SparklesIcon size={22} />
          {isPending ? "무드보드 생성 중... (30초 정도 걸려요)" : "AI 무드보드 생성"}
        </button>

        {/* 결과 */}
        {imageUrl && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="무드보드" className="w-full" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white/30 text-6xl font-black rotate-[-30deg] select-none">
                  참고용
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              ⚠️ 이 이미지는 AI가 생성한 <strong>참고용 시각 자료</strong>입니다. 실제 시공 결과와 다를 수 있으며, 고객에게 보여줄 때 반드시 이 사실을 안내해주세요.
            </div>

            <a
              href={imageUrl}
              download="moodboard.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-gray-300 rounded-xl text-base font-semibold text-gray-700"
            >
              <DownloadIcon size={20} />
              이미지 저장
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
