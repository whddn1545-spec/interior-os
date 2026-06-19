"use client";

import { useState, useRef, useTransition } from "react";
import { CameraIcon, UploadIcon } from "lucide-react";
import { uploadAndTagPhoto } from "./actions";

interface PhotoUploaderProps {
  siteId: string;
}

export function PhotoUploader({ siteId }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        capture="environment"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl py-8 text-blue-600 font-semibold text-lg disabled:opacity-50"
      >
        {isPending ? (
          <>
            <UploadIcon size={28} className="animate-bounce" />
            {status ?? "업로드 중..."}
          </>
        ) : (
          <>
            <CameraIcon size={28} />
            사진 올리기 (AI 자동 분류)
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isPending && status && (
        <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-sm">
          {status}
        </div>
      )}
    </div>
  );
}
