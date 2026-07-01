"use client";

import { useState, useTransition } from "react";
import { generateCaption, createInstagramPost, confirmInstagramPost, publishToInstagram } from "./actions";
import { SparklesIcon, CheckIcon, SendIcon, XIcon } from "lucide-react";

interface Photo {
  id: string;
  publicUrl: string;
  tradeNameKo: string;
  phase: string;
  qualityScore: number;
  captionHint: string;
  siteName: string;
}

interface Post {
  id: string;
  status: string;
  caption: string;
  hashtags: string[];
  photoUrl: string;
}

interface Props {
  recommendedPhotos: Photo[];
  existingPosts: Post[];
}

export function InstagramManager({ recommendedPhotos, existingPosts }: Props) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(existingPosts);
  const [step, setStep] = useState<"select" | "edit">("select");

  const PHASE_LABEL: Record<string, string> = { before: "시공 전", progress: "시공 중", after: "시공 완료" };
  const STATUS_LABEL: Record<string, string> = { draft: "임시저장", confirmed: "확정", published: "게시됨" };

  function handleSelectPhoto(photo: Photo) {
    setSelectedPhoto(photo);
    setCaption(photo.captionHint || "");
    setHashtags([]);
    setStep("edit");
    setError(null);
  }

  function handleGenerateCaption() {
    if (!selectedPhoto) return;
    startTransition(async () => {
      setError(null);
      const result = await generateCaption(selectedPhoto.id);
      if (result.ok) {
        setCaption(result.caption ?? "");
        setHashtags(result.hashtags ?? []);
      } else {
        setError(result.error ?? "캡션 생성 실패");
      }
    });
  }

  function handleSaveDraft() {
    if (!selectedPhoto || !caption) return;
    startTransition(async () => {
      setError(null);
      const result = await createInstagramPost({ photoId: selectedPhoto.id, caption, hashtags });
      if (result.ok) {
        setStep("select");
        setSelectedPhoto(null);
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  function handleConfirm(postId: string) {
    startTransition(async () => {
      const result = await confirmInstagramPost(postId);
      if (!result.ok) setError(result.error ?? "확정 실패");
      else setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "confirmed" } : p));
    });
  }

  function handlePublish(postId: string) {
    startTransition(async () => {
      const result = await publishToInstagram(postId);
      if (!result.ok) setError(result.error ?? "게시 실패");
      else setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "published" } : p));
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base flex items-center gap-2">
          <XIcon size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {step === "select" && (
        <>
          {/* AI 추천 사진 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">AI 추천 사진 (품질 점수 80+)</h2>
            {recommendedPhotos.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground/70">
                <p className="text-base">추천 사진이 없어요</p>
                <p className="text-sm mt-1">사진 관리에서 사진을 업로드하면 AI가 분류해드려요</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recommendedPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className="relative bg-card border border-border rounded-2xl overflow-hidden text-left"
                  >
                    <div className="aspect-square bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.publicUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {photo.qualityScore}점
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-foreground">{photo.tradeNameKo} · {PHASE_LABEL[photo.phase] ?? photo.phase}</p>
                      <p className="text-xs text-muted-foreground truncate">{photo.siteName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 기존 게시물 */}
          {posts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">게시물 관리</h2>
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.photoUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          post.status === "published" ? "bg-green-100 text-profit"
                          : post.status === "confirmed" ? "bg-blue-100 text-primary/90"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {STATUS_LABEL[post.status] ?? post.status}
                        </span>
                        <p className="text-sm text-foreground/90 mt-1 line-clamp-2">{post.caption}</p>
                      </div>
                    </div>
                    {post.status !== "published" && (
                      <div className="flex gap-2 mt-3">
                        {post.status === "draft" && (
                          <button
                            onClick={() => handleConfirm(post.id)}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1 py-3 bg-primary text-white rounded-xl text-base font-semibold active:bg-primary/90"
                          >
                            <CheckIcon size={18} />
                            확정하기
                          </button>
                        )}
                        {post.status === "confirmed" && (
                          <button
                            onClick={() => handlePublish(post.id)}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1 py-3 bg-purple-600 text-white rounded-xl text-base font-semibold active:bg-purple-700"
                          >
                            <SendIcon size={18} />
                            인스타 게시
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {step === "edit" && selectedPhoto && (
        <div className="space-y-4">
          <button onClick={() => setStep("select")} className="text-primary text-base font-medium">
            ← 사진 다시 선택
          </button>

          {/* 선택된 사진 */}
          <div className="aspect-video bg-muted rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto.publicUrl} alt="" className="w-full h-full object-cover" />
          </div>

          {/* AI 캡션 생성 */}
          <button
            onClick={handleGenerateCaption}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl text-base font-semibold"
          >
            <SparklesIcon size={20} />
            {isPending ? "AI 캡션 생성 중..." : "AI로 캡션 생성"}
          </button>

          {/* 캡션 편집 */}
          <div>
            <label className="block text-base font-semibold text-foreground/90 mb-2">캡션</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder="캡션을 입력하거나 AI로 생성하세요"
              className="w-full border border-border rounded-xl px-4 py-3 text-base resize-none"
            />
          </div>

          {/* 해시태그 */}
          {hashtags.length > 0 && (
            <div>
              <label className="block text-base font-semibold text-foreground/90 mb-2">해시태그</label>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <span key={i} className="bg-primary/10 text-primary/90 text-sm px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
            ⚠️ 확정 후 게시됩니다. 게시 전 내용을 반드시 확인하세요.
          </div>

          <button
            onClick={handleSaveDraft}
            disabled={isPending || !caption}
            className="w-full py-4 bg-primary text-white rounded-xl text-lg font-bold disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "임시저장"}
          </button>
        </div>
      )}
    </div>
  );
}
