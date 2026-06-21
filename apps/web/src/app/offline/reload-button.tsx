"use client";

export function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-lg font-semibold"
    >
      다시 시도
    </button>
  );
}
