import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImageIcon, ArrowLeftIcon } from "lucide-react";
import { InstagramManager } from "./instagram-manager";

export default async function InstagramPage() {
  const supabase = await createClient();

  const [{ data: photos }, { data: posts }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, storage_path, phase, quality_score, ai_tags, trade_id, site_id, trades(name_ko), sites(name)")
      .gte("quality_score", 80)
      .eq("status", "auto_tagged")
      .order("quality_score", { ascending: false })
      .limit(20),
    supabase
      .from("instagram_posts")
      .select("id, status, caption, hashtags, photo_id, photos!photo_id(storage_path)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // 서명URL 일괄 발급 (비공개 버킷)
  const photosPaths = (photos ?? []).map((p) => (p as unknown as Record<string, unknown>).storage_path as string);
  const postPhotosPaths = (posts ?? []).map((p) => {
    const pAny = p as unknown as Record<string, unknown>;
    const photo = pAny.photos as { storage_path: string } | null;
    return photo?.storage_path ?? "";
  }).filter(Boolean);

  const allPaths = [...photosPaths, ...postPhotosPaths];
  const { data: signedUrls } = allPaths.length > 0
    ? await supabase.storage.from("photos").createSignedUrls(allPaths, 3600)
    : { data: [] };

  const signedUrlMap = new Map(
    (signedUrls ?? []).map((s) => [s.path, s.signedUrl ?? ""])
  );

  const recommendedPhotos = (photos ?? []).map((p) => {
    const pAny = p as unknown as Record<string, unknown>;
    const aiTags = pAny.ai_tags as { captionHint?: string } | null;
    const trade = pAny.trades as { name_ko: string } | null;
    const site = pAny.sites as { name: string } | null;
    const storagePath = pAny.storage_path as string;

    return {
      id: pAny.id as string,
      publicUrl: signedUrlMap.get(storagePath) ?? "",
      tradeNameKo: trade?.name_ko ?? "인테리어",
      phase: pAny.phase as string ?? "after",
      qualityScore: pAny.quality_score as number ?? 0,
      captionHint: aiTags?.captionHint ?? "",
      siteName: site?.name ?? "",
    };
  });

  const existingPosts = (posts ?? []).map((p) => {
    const pAny = p as unknown as Record<string, unknown>;
    const photo = pAny.photos as { storage_path: string } | null;
    const photoUrl = photo ? (signedUrlMap.get(photo.storage_path) ?? "") : "";

    return {
      id: pAny.id as string,
      status: pAny.status as string,
      caption: pAny.caption as string,
      hashtags: (pAny.hashtags as string[]) ?? [],
      photoUrl,
    };
  });

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 홈으로 돌아가기 (더보기 메뉴로 진입 시 길 잃지 않도록) */}
      <Link
        href="/"
        className="mb-3 -ml-2 inline-flex h-14 items-center gap-2 rounded-xl px-2 text-base font-semibold text-gray-600 active:bg-gray-100"
      >
        <ArrowLeftIcon size={24} />
        홈으로
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <ImageIcon size={28} className="text-pink-600" />
        <h1 className="text-2xl font-bold text-gray-900">인스타그램 마케팅</h1>
      </div>
      <p className="text-base text-gray-500 mb-6">AI가 추천한 사진으로 게시물을 만들어보세요</p>

      <InstagramManager
        recommendedPhotos={recommendedPhotos}
        existingPosts={existingPosts}
      />
    </div>
  );
}
