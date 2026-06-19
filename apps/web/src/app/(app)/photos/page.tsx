import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRightIcon, CameraIcon } from "lucide-react";

export default async function PhotosPage() {
  const supabase = await createClient();

  // 현장 목록 (사진 있는 현장 우선)
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, status, photos(id)")
    .in("status", ["contracted", "in_progress", "done"])
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="px-4 pt-6 pb-24">
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
            return (
              <Link
                key={sAny.id as string}
                href={`/photos/${sAny.id as string}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <CameraIcon size={22} className="text-gray-400" />
                  </div>
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
