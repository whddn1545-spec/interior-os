"use client";

import { TUTORIAL_CONTENT, type TutorialKey } from "@/lib/tutorial/tutorial-content";

type Props = {
  tutorialKey: TutorialKey | null;
  onClose: () => void;
};

export function HelpModal({ tutorialKey, onClose }: Props) {
  if (!tutorialKey) return null;

  const content = TUTORIAL_CONTENT[tutorialKey];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto animate-help-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 X 버튼 */}
        <div className="sticky top-0 bg-card flex justify-end px-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-muted text-2xl text-foreground active:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* 큰 이모지 + 제목 */}
        <div className="px-6 text-center">
          <div className="text-[80px] leading-none">{content.icon}</div>
          <h2 className="text-[28px] font-bold text-foreground mt-2">{content.title}</h2>
        </div>

        {/* 단계별 카드 리스트 */}
        <div className="px-6 mt-6 space-y-3">
          {content.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-muted rounded-2xl px-4 py-4"
            >
              <span className="text-3xl leading-none shrink-0">{step.icon}</span>
              <p className="text-lg text-foreground leading-snug">{step.text}</p>
            </div>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-6 pb-8 sticky bottom-0 bg-card">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary text-white text-xl font-bold rounded-2xl py-5 active:bg-primary/90"
          >
            알겠어요!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes help-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-help-slide-up {
          animation: help-slide-up 0.28s ease-out;
        }
      `}</style>
    </div>
  );
}

export default HelpModal;
