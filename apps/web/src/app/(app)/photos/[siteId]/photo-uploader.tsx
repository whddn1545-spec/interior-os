"use client";

import { useState, useRef, useTransition } from "react";
import { CameraIcon, ImageIcon, UploadIcon } from "lucide-react";
import { uploadAndTagPhoto } from "./actions";

interface PhotoUploaderProps {
  siteId: string;
}

export function PhotoUploader({ siteId }: PhotoUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    startTransition(async () => {
      setStatus(`${files.length}장 업로드 중...`);
      setError(null);
      let successCount = 0;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("siteId", siteId);

        const result = await uploadAndTagPhoto(formData);
        if (result.ok) {
          successCount++;
          setStatus(`${successCount}/${files.length}장 완료`);
        } else {
          setError(result.error ?? "업로드 실패");
        }
      }

      setStatus(`${successCount}장 업로드 완료 (AI 분석 중...)`);
      setTimeout(() => setStatus(null), 3000);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    });
  }

  return (
    <div>
      {/* 카메라 전용 input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* 갤러리 전용 input (multiple) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {isPending ? (
        <div className="w-full flex items-center justify-center gap-3 bg-primary/10 border-2 border-dashed border-blue-300 rounded-2xl py-8 text-primary font-semibold text-lg">
          <UploadIcon size={28} className="animate-bounce" />
          {status ?? "업로드 중..."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 bg-primary/10 border-2 border-dashed border-blue-300 rounded-2xl py-6 text-primary font-semibold active:bg-blue-100"
          >
            <CameraIcon size={28} />
            <span className="text-base">카메라 촬영</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl py-6 text-gray-600 font-semibold active:bg-gray-100"
          >
            <ImageIcon size={28} />
            <span className="text-base">사진첩 선택</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 bg-red-50 border border-loss/30 rounded-xl px-4 py-2 text-loss text-sm">
          {error}
        </div>
      )}

      {!isPending && status && (
        <div className="mt-2 bg-profit/10 border border-profit/20 rounded-xl px-4 py-2 text-profit text-sm">
          {status}
        </div>
      )}
    </div>
  );
}
