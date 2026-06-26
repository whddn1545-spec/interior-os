import { TUTORIAL_CONTENT, type TutorialKey } from "@/lib/tutorial/tutorial-content";

export default function HelpCenterPage() {
  const keys = Object.keys(TUTORIAL_CONTENT) as TutorialKey[];

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">도움말</h1>
        <p className="text-lg text-gray-500">궁금한 메뉴를 눌러보세요</p>
      </div>

      <div className="space-y-3">
        {keys.map((key) => {
          const content = TUTORIAL_CONTENT[key];
          return (
            <details
              key={key}
              className="bg-white border border-gray-200 rounded-2xl px-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center gap-3 py-4 cursor-pointer text-lg font-bold text-gray-900 list-none">
                <span className="text-2xl">{content.icon}</span>
                <span>{content.title}</span>
                <span className="ml-auto text-gray-400 text-base">자세히</span>
              </summary>
              <div className="pb-4 space-y-3">
                {content.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 bg-gray-50 rounded-2xl px-4 py-4"
                  >
                    <span className="text-3xl leading-none shrink-0">{step.icon}</span>
                    <p className="text-lg text-gray-800 leading-snug">{step.text}</p>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
