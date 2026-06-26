import { notFound } from "next/navigation";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PhotoUploader } from "./photo-uploader";
import { PhotoCard } from "./photo-card";

function formatDateKR(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function SitePhotosPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name")
    .eq("id", siteId)
    .single();

  if (!site) notFound();

  const [{ data: photos }, { data: trades }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, storage_path, phase, trade_id, quality_score, ai_tags, status, taken_at, trades(id, name_ko, code)")
      .eq("site_id", siteId)
      .order("taken_at", { ascending: false }),
    supabase.from("trades").select("id, code, name_ko").order("name_ko"),
  ]);

  const tradeList = (trades as { id: string; code: string; name_ko: string }[] | null) ?? [];
  const photoList = (photos as unknown as Record<string, unknown>[]) ?? [];
  const s = site as unknown as Record<string, unknown>;

  // 서명 URL 생성
  const storagePaths = photoList.map((photo) => photo.storage_path as string);
  const signedUrlByPath = new Map<string, string>();
  if (storagePaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("photos")
      .createSignedUrls(storagePaths, 3600);
    for (const entry of signedUrls ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlByPath.set(entry.path, entry.signedUrl);
      }
    }
  }

  // 날짜별 그룹핑
  const grouped = new Map<string, typeof photoList>();
  for (const photo of photoList) {
    const takenAt = photo.taken_at as string | null;
    const dateKey = takenAt ? takenAt.split("T")[0] : "날짜 미확인";
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(photo);
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/photos" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.name as string}</h1>
          <p className="text-sm text-gray-500">사진 {photoList.length}장</p>
        </div>
      </div>

      {/* 분쟁방패 배너 */}
      {photoList.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
          <ShieldCheckIcon size={22} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-800">분쟁방패 활성화</p>
            <p className="text-xs text-green-600">날짜·시간이 기록된 공사 사진은 분쟁 발생 시 강력한 증거가 됩니다.</p>
          </div>
        </div>
      )}

      <PhotoUploader siteId={siteId} />

      {photoList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">사진을 올려주세요</p>
          <p className="text-sm mt-1">날짜별로 정리되고, 분쟁 발생 시 증거로 활용할 수 있어요</p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {Array.from(grouped.entries()).map(([dateKey, datePhotos]) => (
            <div key={dateKey}>
              <p className="text-sm font-bold text-gray-500 mb-2">
                📅 {dateKey === "날짜 미확인" ? dateKey : formatDateKR(dateKey)}
                <span className="font-normal ml-1">({datePhotos.length}장)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {datePhotos.map((photo) => {
                  const tradeMeta = photo.trades as { id: string; name_ko: string; code: string } | null;
                  const aiTags = photo.ai_tags as Record<string, unknown> | null;
                  return (
                    <PhotoCard
                      key={photo.id as string}
                      siteId={siteId}
                      signedUrl={signedUrlByPath.get(photo.storage_path as string) ?? null}
                      trades={tradeList.map((t) => ({ id: t.id, code: t.code, nameKo: t.name_ko }))}
                      photo={{
                        id: photo.id as string,
                        storagePath: photo.storage_path as string,
                        phase: photo.phase as string | null,
                        tradeId: photo.trade_id as string | null,
                        tradeName: tradeMeta?.name_ko ?? null,
                        qualityScore: photo.quality_score as number | null,
                        captionHint: aiTags?.captionHint as string | null,
                        isTagged: photo.status === "auto_tagged" || photo.status === "reviewed",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
