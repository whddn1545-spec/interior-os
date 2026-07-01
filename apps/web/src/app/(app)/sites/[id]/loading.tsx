export default function SiteHubLoading() {
  return (
    <div className="min-h-screen bg-muted animate-pulse">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="h-6 w-6 bg-muted rounded" />
        <div className="flex-1">
          <div className="h-6 w-1/2 bg-muted rounded-lg" />
          <div className="mt-1 h-4 w-1/3 bg-muted rounded-lg" />
        </div>
      </div>
      <div className="bg-card border-b border-border flex gap-2 px-4 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-16 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="bg-card rounded-2xl h-40 border border-border" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl h-28 border border-border" />
          <div className="bg-card rounded-2xl h-28 border border-border" />
        </div>
        <div className="bg-card rounded-2xl h-20 border border-border" />
      </div>
    </div>
  );
}
