export const dynamic = "force-dynamic";

import { ReloadButton } from "./reload-button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">인터넷 연결이 필요해요</h1>
      <p className="text-lg text-gray-500 mb-6">
        네트워크 연결을 확인한 후 다시 시도해주세요.
      </p>
      <ReloadButton />
    </div>
  );
}
