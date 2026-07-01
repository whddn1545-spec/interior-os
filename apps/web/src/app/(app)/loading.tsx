export default function AppLoading() {
  return (
    <div className="px-4 pt-6 pb-24 animate-pulse space-y-4">
      <div className="h-9 w-48 bg-muted rounded-xl" />
      <div className="h-6 w-32 bg-muted rounded-xl" />
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl px-5 py-5 space-y-2">
            <div className="h-5 w-3/4 bg-muted rounded-lg" />
            <div className="h-4 w-1/2 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
