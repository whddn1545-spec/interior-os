export function Money({
  value,
  size = "lg",
  showSign = false,
}: {
  value: number;
  size?: "sm" | "lg" | "xl";
  showSign?: boolean;
}) {
  const tone =
    value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-foreground";
  const sizeCls =
    size === "xl" ? "text-3xl" : size === "lg" ? "text-2xl" : "text-lg";
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span className={`${sizeCls} font-black tabular-nums tracking-tight ${tone}`}>
      {sign}
      {value.toLocaleString("ko-KR")}원
    </span>
  );
}
