export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-6 pb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] font-black tracking-tight text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
