import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRightIcon, CameraIcon, ArrowLeftIcon } from "lucide-react";

export default async function PhotosPage() {
  const supabase = await createClient();

  // 현장 목록 전체 (모든 상태) + 각 현장 사진의 storage_path
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, status, photos(id, storage_path, taken_at)")
    .order("created_at", { ascending: false })
    .limit(50);

  // 현장별 대표 썸네일(가장 최근 사진)의 서명 URL 발급 (비공개 버킷)
  const siteList = (sites as unknown as Record<string, unknown>[]) ?? [];
  const coverPathBySite = new Map<string, string>();
  for (const site of siteList) {
    const sitePhotos = (site.photos as { storage_path: string; taken_at: string | null }[] | null) ?? [];
    if (sitePhotos.length === 0) continue;
    // 가장 최근에 찍은 사진을 대표 썸네일로 사용
    const cover = [...sitePhotos].sort((a, b) =>
      (b.taken_at ?? "").localeCompare(a.taken_at ?? "")
    )[0];
    if (cover?.storage_path) {
      coverPathBySite.set(site.id as string, cover.storage_path);
    }
  }

  const coverPaths = Array.from(coverPathBySite.values());
  const signedUrlByPath = new Map<string, string>();
  if (coverPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("photos")
      .createSignedUrls(coverPaths, 3600);
    for (const entry of signedUrls ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlByPath.set(entry.path, entry.signedUrl);
      }
    }
  }

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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">사진 관리</h1>

      {!sites || sites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CameraIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-xl">현장을 선택해서 사진을 올려보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map((site) => {
            const sAny = site as unknown as Record<string, unknown>;
            const photos = (sAny.photos as { id: string }[] | null) ?? [];
            const coverPath = coverPathBySite.get(sAny.id as string);
            const coverUrl = coverPath ? signedUrlByPath.get(coverPath) : undefined;
            return (
              <Link
                key={sAny.id as string}
                href={`/photos/${sAny.id as string}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={`${sAny.name as string} 대표 사진`}
                      className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <CameraIcon size={22} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-gray-900">{sAny.name as string}</p>
                    <p className="text-sm text-gray-500">사진 {photos.length}장</p>
                  </div>
                </div>
                <ChevronRightIcon size={18} className="text-gray-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
