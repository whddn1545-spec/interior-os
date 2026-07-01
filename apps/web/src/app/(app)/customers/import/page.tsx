"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, UploadIcon, CheckCircleIcon } from "lucide-react";
import { previewCsvImport, importCustomers, type ImportPreview, type ImportRow } from "./actions";
import { useRouter } from "next/navigation";

type Step = "upload" | "preview" | "done";

export default function CustomerImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      setError(null);
      const result = await previewCsvImport(formData);
      if (result.ok && result.data) {
        setPreview(result.data);
        setStep("preview");
      } else {
        setError(result.error ?? "파일 분석 실패");
      }
    });
  }

  function handleImport() {
    if (!preview) return;

    const rows: ImportRow[] = preview.rows
      .filter((r) => !(skipDuplicates && r.isDuplicate))
      .map((row) => { const r = { ...row }; delete r.isDuplicate; return r; });

    startTransition(async () => {
      setError(null);
      const result = await importCustomers(rows);
      if (result.ok) {
        setImportedCount(result.imported);
        setStep("done");
      } else {
        setError(result.error ?? "가져오기 실패");
      }
    });
  }

  return (
    <div className="min-h-screen bg-muted pb-24">
      <header className="sticky top-0 bg-card border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/customers" className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground">연락처 가져오기</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {step === "upload" && (
          <>
            {/* 안내 */}
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-base text-blue-800">
              <p className="font-semibold mb-2">CSV 파일로 고객을 한 번에 가져올 수 있어요</p>
              <ul className="space-y-1 text-sm text-primary/90">
                <li>• 첫 줄: 이름, 전화번호 (필수) / 주소, 메모 (선택)</li>
                <li>• 스마트폰 연락처 → 공유 → CSV로 내보내기 가능</li>
                <li>• 중복 전화번호는 자동으로 건너뜁니다</li>
              </ul>
            </div>

            {/* 예시 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold text-foreground/90 mb-2">CSV 예시</p>
              <pre className="text-xs text-muted-foreground overflow-x-auto">{`이름,전화번호,주소,메모
김영희,010-1234-5678,서울 강남구,VIP 고객
이철수,010-9876-5432,,소개로 연결`}</pre>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-primary text-white rounded-2xl py-5 text-lg font-bold disabled:opacity-50"
            >
              <UploadIcon size={24} />
              {isPending ? "분석 중..." : "CSV 파일 선택"}
            </button>

            {error && (
              <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
                {error}
              </div>
            )}
          </>
        )}

        {step === "preview" && preview && (
          <>
            {/* 미리보기 요약 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-foreground">{preview.total}</p>
                <p className="text-sm text-muted-foreground">전체</p>
              </div>
              <div className="bg-profit/10 border border-profit/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-profit">{preview.total - preview.duplicates}</p>
                <p className="text-sm text-muted-foreground">신규</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{preview.duplicates}</p>
                <p className="text-sm text-muted-foreground">중복</p>
              </div>
            </div>

            {preview.duplicates > 0 && (
              <label className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-base text-foreground/90">중복 연락처 건너뛰기</span>
              </label>
            )}

            {/* 목록 미리보기 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                    row.isDuplicate
                      ? "bg-amber-50 border-amber-200 opacity-60"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.phone}</p>
                  </div>
                  {row.isDuplicate && (
                    <span className="text-xs text-amber-600 font-medium shrink-0">중복</span>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("upload"); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="flex-1 py-4 border-2 border-border rounded-xl text-base font-semibold text-foreground/90"
              >
                다시 선택
              </button>
              <button
                onClick={handleImport}
                disabled={isPending || (skipDuplicates && preview.total === preview.duplicates)}
                className="flex-1 py-4 bg-primary text-white rounded-xl text-base font-bold disabled:opacity-50"
              >
                {isPending ? "가져오는 중..." : `${skipDuplicates ? preview.total - preview.duplicates : preview.total}명 가져오기`}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-12">
            <CheckCircleIcon size={64} className="mx-auto text-green-500 mb-4" />
            <p className="text-2xl font-bold text-foreground mb-2">가져오기 완료!</p>
            <p className="text-lg text-muted-foreground mb-8">{importedCount}명의 고객이 등록되었어요</p>
            <button
              onClick={() => router.push("/customers")}
              className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold"
            >
              고객 목록 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
