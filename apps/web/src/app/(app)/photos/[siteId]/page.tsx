import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PhotoUploader } from "./photo-uploader";

export default async function SitePhotosPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name")
    .eq("id", siteId)
    .single();

  if (!site) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, phase, trade_id, quality_score, ai_tags, taken_at, status, trades(name_ko)")
    .eq("site_id", siteId)
    .order("taken_at", { ascending: false });

  const PHASE_LABEL: Record<string, string> = {
    before: "착공 전", during: "시공 중", after: "완공 후",
  };

  const s = site as unknown as Record<string, unknown>;
  const photoList = (photos as unknown as Record<string, unknown>[]) ?? [];

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/photos" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.name as string}</h1>
          <p className="text-sm text-gray-500">사진 {photoList.length}장</p>
        </div>
      </div>

      {/* 업로드 영역 */}
      <PhotoUploader siteId={siteId} />

      {/* 사진 그리드 */}
      {photoList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">사진을 올려주세요</p>
          <p className="text-sm mt-1">AI가 자동으로 공종과 단계를 분류해드려요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {photoList.map((photo) => {
            const phase = photo.phase as string | null;
            const tradeName = (photo.trades as { name_ko: string } | null)?.name_ko ?? null;
            const qualityScore = photo.quality_score as number | null;
            const aiTags = photo.ai_tags as Record<string, unknown> | null;
            const captionHint = aiTags?.captionHint as string | null;
            const isTagged = photo.status === "auto_tagged" || photo.status === "reviewed";

            return (
              <div
                key={photo.id as string}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path as string}`}
                    alt={captionHint ?? "현장 사진"}
                    className="w-full h-full object-cover"
                  />
                  {isTagged && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                      AI 분석
                    </div>
                  )}
                </div>
                <div className="p-2">
                  {phase && (
                    <p className="text-xs font-medium text-blue-700">{PHASE_LABEL[phase] ?? phase}</p>
                  )}
                  {tradeName && (
                    <p className="text-xs text-gray-600">{tradeName}</p>
                  )}
                  {captionHint && (
                    <p className="text-xs text-gray-500 truncate">{captionHint}</p>
                  )}
                  {qualityScore !== null && (
                    <p className="text-xs text-amber-500">품질 {Math.round(qualityScore * 100)}%</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
