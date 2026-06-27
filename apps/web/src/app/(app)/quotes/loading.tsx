export default function QuotesLoading() {
  return (
    <div className="px-4 pt-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-20 bg-gray-200 rounded-xl" />
        <div className="h-11 w-24 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-100 rounded-2xl h-20" />
        <div className="bg-gray-100 rounded-2xl h-20" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl px-4 py-4">
            <div className="flex justify-between mb-2">
              <div className="h-5 w-2/3 bg-gray-100 rounded-lg" />
              <div className="h-5 w-16 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-4 w-1/2 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
