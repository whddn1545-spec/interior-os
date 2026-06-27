export default function WorkersLoading() {
  return (
    <div className="px-4 pt-6 pb-24 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-24 bg-gray-200 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-12 w-12 bg-gray-100 rounded-xl" />
          <div className="h-12 w-20 bg-gray-200 rounded-xl" />
        </div>
      </div>
      <div className="h-16 bg-orange-50 border border-orange-100 rounded-2xl mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl px-4 py-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-1/4 bg-gray-100 rounded-lg" />
              <div className="h-4 w-2/5 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-10 w-16 bg-gray-100 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
