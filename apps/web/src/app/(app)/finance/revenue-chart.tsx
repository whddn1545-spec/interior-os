interface MonthData {
  label: string;      // "1월", "2월" …
  shortLabel: string; // "1", "2" …
  income: number;
  expense: number;
  isCurrentMonth: boolean;
}

interface Props {
  months: MonthData[];
}

function formatShort(v: number): string {
  if (v === 0) return "0";
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000_000) return `${Math.round(v / 10_000_000) * 10}백만`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}백만`;
  if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
  return `${v.toLocaleString("ko-KR")}`;
}

export function RevenueChart({ months }: Props) {
  const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));

  // SVG 레이아웃 상수
  const W = 360;
  const H = 160;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 36;
  const BAR_AREA_H = H - PAD_TOP - PAD_BOTTOM;
  const N = months.length;
  const GROUP_W = W / N;
  const BAR_GAP = 3;
  const BAR_W = (GROUP_W - 12) / 2;

  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpense = months.reduce((s, m) => s + m.expense, 0);
  const netProfit = totalIncome - totalExpense;

  const bars = months.map((m, i) => {
    const groupX = i * GROUP_W + 6;
    const inH = m.income > 0 ? Math.max(4, (m.income / maxVal) * BAR_AREA_H) : 0;
    const exH = m.expense > 0 ? Math.max(4, (m.expense / maxVal) * BAR_AREA_H) : 0;

    const inX = groupX;
    const exX = groupX + BAR_W + BAR_GAP;

    const inY = PAD_TOP + BAR_AREA_H - inH;
    const exY = PAD_TOP + BAR_AREA_H - exH;

    const labelX = groupX + BAR_W;
    const labelY = H - 6;

    return { m, inX, exX, inH, exH, inY, exY, labelX, labelY, BAR_W };
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* 상단 요약 수치 */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">6개월 매출 추이</p>
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground">수입 합계</p>
            <p className="text-lg font-black text-profit">{formatShort(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">지출 합계</p>
            <p className="text-lg font-black text-loss">{formatShort(totalExpense)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">순이익</p>
            <p className={`text-lg font-black ${netProfit >= 0 ? "text-primary" : "text-loss"}`}>
              {netProfit >= 0 ? "+" : ""}{formatShort(netProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* SVG 차트 */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="overflow-visible"
        aria-label="6개월 매출 차트"
      >
        {/* 가이드라인 */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + BAR_AREA_H * (1 - frac);
          return (
            <line
              key={frac}
              x1={0} y1={y} x2={W} y2={y}
              stroke="currentColor"
              strokeOpacity="0.07"
              strokeWidth="1"
            />
          );
        })}

        {/* 수평 baseline */}
        <line
          x1={0} y1={PAD_TOP + BAR_AREA_H}
          x2={W} y2={PAD_TOP + BAR_AREA_H}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {bars.map(({ m, inX, exX, inH, exH, inY, exY, labelX, labelY, BAR_W: bw }) => (
          <g key={m.label}>
            {/* 현재 달 배경 강조 */}
            {m.isCurrentMonth && (
              <rect
                x={inX - 3}
                y={PAD_TOP - 4}
                width={bw * 2 + BAR_GAP + 6}
                height={BAR_AREA_H + 4}
                rx={4}
                fill="currentColor"
                fillOpacity="0.04"
              />
            )}

            {/* 수입 바 */}
            {inH > 0 && (
              <rect
                x={inX}
                y={inY}
                width={bw}
                height={inH}
                rx={3}
                className="fill-profit"
                fillOpacity={m.isCurrentMonth ? 1 : 0.65}
              />
            )}

            {/* 지출 바 */}
            {exH > 0 && (
              <rect
                x={exX}
                y={exY}
                width={bw}
                height={exH}
                rx={3}
                className="fill-loss"
                fillOpacity={m.isCurrentMonth ? 1 : 0.55}
              />
            )}

            {/* 월 라벨 */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize="10"
              fontWeight={m.isCurrentMonth ? "800" : "500"}
              fill="currentColor"
              fillOpacity={m.isCurrentMonth ? 0.9 : 0.5}
              className="select-none"
            >
              {m.shortLabel}월
            </text>

            {/* 현재 달 최대값 라벨 */}
            {m.isCurrentMonth && m.income > 0 && (
              <text
                x={inX + bw / 2}
                y={inY - 4}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="currentColor"
                fillOpacity="0.7"
                className="select-none"
              >
                {formatShort(m.income)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* 범례 */}
      <div className="flex items-center gap-4 px-4 pb-4 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-profit" />
          <span className="text-xs text-muted-foreground">수입</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-loss" />
          <span className="text-xs text-muted-foreground">지출</span>
        </div>
      </div>
    </div>
  );
}
