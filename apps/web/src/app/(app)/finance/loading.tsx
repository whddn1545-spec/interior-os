export default function FinanceLoading() {
  return (
    <div className="px-4 pt-6 pb-24 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-24 bg-gray-200 rounded-xl" />
        <div className="h-11 w-24 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-20" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl px-4 py-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-100 rounded-lg" />
              <div className="h-4 w-20 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-5 w-24 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
