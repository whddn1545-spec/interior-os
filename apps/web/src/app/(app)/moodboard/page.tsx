"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowLeftIcon, SparklesIcon, DownloadIcon, CameraIcon, ImageIcon, XIcon } from "lucide-react";
import { generateMoodboard, generateVisualization } from "./actions";

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

type Mode = "text" | "photo";

export default function MoodboardPage() {
  const [mode, setMode] = useState<Mode>("photo");

  // 공통 옵션
  const [spaceType, setSpaceType] = useState(SPACE_TYPES[0].value);
  const [style, setStyle] = useState(STYLES[0].value);
  const [selectedColors, setSelectedColors] = useState<string[]>([COLOR_OPTIONS[0].value]);
  const [area, setArea] = useState(AREA_OPTIONS[1].value);

  // 텍스트 모드 결과
  const [textImageUrl, setTextImageUrl] = useState<string | null>(null);

  // 사진 시각화 모드
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [floor, setFloor] = useState("");
  const [wall, setWall] = useState("");
  const [kitchen, setKitchen] = useState("");
  const [bathroom, setBathroom] = useState("");
  const [extra, setExtra] = useState("");
  const [preferences, setPreferences] = useState("");
  const [visualUrl, setVisualUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function toggleColor(val: string) {
    setSelectedColors((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val].slice(-3)
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBeforeFile(file);
    setBeforePreview(URL.createObjectURL(file));
    setVisualUrl(null);
    setError(null);
  }

  function clearBeforeImage() {
    setBeforeFile(null);
    setBeforePreview(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  function handleGenerateText() {
    if (selectedColors.length === 0) return;
    startTransition(async () => {
      setError(null);
      setTextImageUrl(null);
      const result = await generateMoodboard({ spaceType, style, colors: selectedColors, area });
      if (result.ok) setTextImageUrl(result.imageUrl ?? null);
      else setError(result.error ?? "생성 실패");
    });
  }

  function handleGenerateVisualization() {
    if (!beforeFile) { setError("공사 전 사진을 먼저 올려주세요"); return; }
    startTransition(async () => {
      setError(null);
      setVisualUrl(null);
      const fd = new FormData();
      fd.append("image", beforeFile);
      fd.append("style", style);
      fd.append("colors", JSON.stringify(selectedColors));
      fd.append("spaceType", spaceType);
      fd.append("floor", floor);
      fd.append("wall", wall);
      fd.append("kitchen", kitchen);
      fd.append("bathroom", bathroom);
      fd.append("extra", extra);
      fd.append("preferences", preferences);
      const result = await generateVisualization(fd);
      if (result.ok) setVisualUrl(result.imageUrl ?? null);
      else setError(result.error ?? "생성 실패");
    });
  }

  const resultUrl = mode === "text" ? textImageUrl : visualUrl;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">인테리어 무드보드</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">

        {/* 모드 토글 */}
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setMode("photo")}
            className={`py-3 rounded-xl text-base font-bold transition-colors ${
              mode === "photo" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}
          >
            📸 완공 시각화
          </button>
          <button
            onClick={() => setMode("text")}
            className={`py-3 rounded-xl text-base font-bold transition-colors ${
              mode === "text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}
          >
            ✨ 아이디어 생성
          </button>
        </div>

        {/* ===== 완공 시각화 모드 ===== */}
        {mode === "photo" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
              <strong>공사 전 사진 또는 도면</strong>을 올리고 사용할 자재를 입력하면<br />
              AI가 실제 완공 모습을 시각화해드려요.
            </div>

            {/* 사진 업로드 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                공사 전 사진 / 도면
              </label>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {beforePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforePreview} alt="공사 전" className="w-full max-h-64 object-cover" />
                  <button
                    onClick={clearBeforeImage}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5"
                  >
                    <XIcon size={18} />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    공사 전
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="flex flex-col items-center gap-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl py-6 text-blue-600 font-semibold"
                  >
                    <CameraIcon size={28} />
                    <span className="text-base">현장 촬영</span>
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="flex flex-col items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl py-6 text-gray-600 font-semibold"
                  >
                    <ImageIcon size={28} />
                    <span className="text-base">앨범 / 도면</span>
                  </button>
                </div>
              )}
            </div>

            {/* 공간 유형 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">공간</label>
              <div className="grid grid-cols-3 gap-2">
                {SPACE_TYPES.map(({ value, label }) => (
                  <button key={value} onClick={() => setSpaceType(value)}
                    className={`py-4 rounded-xl text-base font-semibold transition-colors ${spaceType === value ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 사용 자재 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">사용 자재</label>
              <div className="space-y-4">
                {[
                  { key: "floor", label: "바닥재", placeholder: "예: 원목마루, 강마루, 포세린 타일", value: floor, set: setFloor },
                  { key: "wall", label: "벽지/도장", placeholder: "예: 밝은 베이지 실크벽지, 화이트 도장", value: wall, set: setWall },
                  { key: "kitchen", label: "주방 상판/타일", placeholder: "예: 화이트 쿼츠스톤, 그레이 타일", value: kitchen, set: setKitchen },
                  { key: "bathroom", label: "욕실 타일", placeholder: "예: 600×600 그레이 포세린", value: bathroom, set: setBathroom },
                  { key: "extra", label: "기타 자재", placeholder: "예: 아트월 대리석 시트지, 몰딩", value: extra, set: setExtra },
                ].map(({ key, label, placeholder, value, set }) => (
                  <div key={key}>
                    <label className="block text-base font-semibold text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 스타일 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">인테리어 스타일</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(({ value, label }) => (
                  <button key={value} onClick={() => setStyle(value)}
                    className={`py-4 rounded-xl text-base font-semibold transition-colors ${style === value ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 색상 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                색상 <span className="text-sm font-normal text-gray-500">(최대 3개)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => toggleColor(value)}
                    className={`py-4 rounded-xl text-base font-semibold transition-colors ${selectedColors.includes(value) ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 고객 요청사항 */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                고객 요청사항 <span className="text-sm font-normal text-gray-500">(선택)</span>
              </label>
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="예: 수납공간 많이, 아이 있어서 안전한 소재, 밝고 넓어 보이게, 모던하면서 따뜻한 느낌"
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
            )}

            <button
              onClick={handleGenerateVisualization}
              disabled={isPending || !beforeFile}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold disabled:opacity-50"
            >
              <SparklesIcon size={22} />
              {isPending ? "AI가 완공 모습 생성 중... (30-60초)" : "AI 완공 시각화"}
            </button>

            {/* 결과 */}
            {visualUrl && (
              <ResultCard
                beforeUrl={beforePreview}
                afterUrl={visualUrl}
                label="완공 시각화"
              />
            )}
          </>
        )}

        {/* ===== 아이디어 생성 모드 ===== */}
        {mode === "text" && (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-800">
              AI가 고객에게 보여줄 인테리어 무드보드를 만들어드려요.<br />
              <strong>참고용 이미지</strong>이며 실제 시공 결과와 다를 수 있어요.
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">공간</label>
              <div className="grid grid-cols-3 gap-2">
                {SPACE_TYPES.map(({ value, label }) => (
                  <button key={value} onClick={() => setSpaceType(value)}
                    className={`py-3 rounded-xl text-base font-semibold transition-colors ${spaceType === value ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">스타일</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(({ value, label }) => (
                  <button key={value} onClick={() => setStyle(value)}
                    className={`py-4 rounded-xl text-base font-semibold transition-colors ${style === value ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                색상 <span className="text-sm font-normal text-gray-500">(최대 3개)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => toggleColor(value)}
                    className={`py-4 rounded-xl text-base font-semibold transition-colors ${selectedColors.includes(value) ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">평수</label>
              <div className="grid grid-cols-4 gap-2">
                {AREA_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => setArea(value)}
                    className={`py-3 rounded-xl text-base font-semibold transition-colors ${area === value ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
            )}

            <button
              onClick={handleGenerateText}
              disabled={isPending || selectedColors.length === 0}
              className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white rounded-xl text-lg font-bold disabled:opacity-50"
            >
              <SparklesIcon size={22} />
              {isPending ? "무드보드 생성 중... (30초 정도 걸려요)" : "AI 무드보드 생성"}
            </button>

            {textImageUrl && (
              <ResultCard afterUrl={textImageUrl} label="무드보드" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({ beforeUrl, afterUrl, label }: { beforeUrl?: string | null; afterUrl: string; label: string }) {
  return (
    <div className="space-y-3">
      {beforeUrl && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">공사 전</p>
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beforeUrl} alt="공사 전" className="w-full max-h-48 object-cover" />
          </div>
        </div>
      )}

      <div>
        {beforeUrl && <p className="text-sm font-semibold text-blue-600 mb-1">AI 완공 시각화</p>}
        <div className="relative rounded-2xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterUrl} alt={label} className="w-full" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/20 text-5xl font-black rotate-[-30deg] select-none">참고용</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        ⚠️ AI가 생성한 <strong>참고용 시각 자료</strong>입니다. 실제 시공 결과와 다를 수 있으며, 고객에게 반드시 안내해주세요.
      </div>

      <a
        href={afterUrl}
        download={`${label}.png`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 border-2 border-gray-300 rounded-xl text-base font-semibold text-gray-700"
      >
        <DownloadIcon size={20} />
        이미지 저장
      </a>
    </div>
  );
}
