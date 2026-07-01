export default function CustomersLoading() {
  return (
    <div className="px-4 pt-6 pb-24 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-24 bg-muted rounded-xl" />
        <div className="h-11 w-24 bg-muted rounded-xl" />
      </div>
      <div className="relative mb-4">
        <div className="h-14 w-full bg-muted rounded-2xl" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl px-4 py-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-1/3 bg-muted rounded-lg" />
              <div className="h-4 w-1/2 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
