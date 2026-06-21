import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PhotoUploader } from "./photo-uploader";
import { PhotoCard } from "./photo-card";

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
      .select("id, storage_path, phase, trade_id, quality_score, ai_tags, status, trades(id, name_ko, code)")
      .eq("site_id", siteId)
      .order("taken_at", { ascending: false }),
    supabase.from("trades").select("id, code, name_ko").order("name_ko"),
  ]);

  const tradeList = (trades as { id: string; code: string; name_ko: string }[] | null) ?? [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const photoList = (photos as unknown as Record<string, unknown>[]) ?? [];
  const s = site as unknown as Record<string, unknown>;

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

      <PhotoUploader siteId={siteId} />

      {photoList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">사진을 올려주세요</p>
          <p className="text-sm mt-1">AI가 자동으로 공종과 단계를 분류해드려요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {photoList.map((photo) => {
            const tradeMeta = photo.trades as { id: string; name_ko: string; code: string } | null;
            const aiTags = photo.ai_tags as Record<string, unknown> | null;
            return (
              <PhotoCard
                key={photo.id as string}
                siteId={siteId}
                supabaseUrl={supabaseUrl}
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
      )}
    </div>
  );
}
