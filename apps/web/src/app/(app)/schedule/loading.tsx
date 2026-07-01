export default function ScheduleLoading() {
  return (
    <div className="px-4 pt-6 pb-24 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded-xl mb-6" />
      <div className="h-12 bg-primary/10 rounded-2xl mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl px-4 py-4 space-y-3">
            <div className="h-6 w-2/3 bg-muted rounded-lg" />
            <div className="h-4 w-1/3 bg-muted rounded-lg" />
            <div className="h-2 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
