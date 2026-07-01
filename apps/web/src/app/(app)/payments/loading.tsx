export default function PaymentsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-muted rounded-xl mb-2" />
        <div className="h-5 w-24 bg-muted rounded-lg mb-1" />
        <div className="h-10 w-48 bg-muted rounded-xl" />
      </div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-20 bg-muted rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="h-6 w-3/4 bg-muted rounded-lg" />
            <div className="h-4 w-1/2 bg-muted rounded-lg" />
            <div className="flex gap-2 mt-2">
              <div className="h-12 flex-1 bg-muted rounded-xl" />
              <div className="h-12 flex-1 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
