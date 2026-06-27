export default function SiteHubLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="h-6 w-6 bg-gray-200 rounded" />
        <div className="flex-1">
          <div className="h-6 w-1/2 bg-gray-200 rounded-lg" />
          <div className="mt-1 h-4 w-1/3 bg-gray-100 rounded-lg" />
        </div>
      </div>
      <div className="bg-white border-b border-gray-100 flex gap-2 px-4 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="bg-white rounded-2xl h-40 border border-gray-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl h-28 border border-gray-100" />
          <div className="bg-white rounded-2xl h-28 border border-gray-100" />
        </div>
        <div className="bg-white rounded-2xl h-20 border border-gray-100" />
      </div>
    </div>
  );
}
