/** 아침 브리핑에 들어가는 오늘 작업 1건 */
export interface BriefingTask {
  siteName: string;
  title: string;
  workerNames: string[];
}

/** 아침 브리핑에 들어가는 미수금 1건 */
export interface BriefingPayment {
  siteName: string;
  stageLabel: string;
  amount: number;
  /** 약정일 기준 경과일. 양수 = 연체, 0 = 오늘, 음수 = 남음 */
  overdueDays: number;
}

export interface BriefingInput {
  /** "7월 5일 (토)" 형태 */
  dateLabel: string;
  tasks: BriefingTask[];
  /** 연체 또는 3일 내 도래하는 미수금 */
  payments: BriefingPayment[];
  /** 보낸 지 3일 넘게 응답 없는 견적 수 */
  staleQuoteCount: number;
}

function formatManwon(amount: number): string {
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return Number.isInteger(eok) ? `${eok}억원` : `${eok.toFixed(1)}억원`;
  }
  if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString("ko-KR")}만원`;
  return `${amount.toLocaleString("ko-KR")}원`;
}

function dueLabel(overdueDays: number): string {
  if (overdueDays > 0) return `${overdueDays}일 지남`;
  if (overdueDays === 0) return "오늘 약정";
  return `${-overdueDays}일 후 약정`;
}

/**
 * 사장님 아침 브리핑 SMS 본문 조립.
 * 순수 함수 — DB / LLM / 네트워크 접근 없음. 모든 숫자는 호출부에서 확정된 값.
 *
 * 알릴 내용이 하나도 없으면 null을 반환한다 (문자를 보내지 않음).
 */
export function composeBriefing(input: BriefingInput): string | null {
  const sections: string[] = [];

  if (input.tasks.length > 0) {
    const lines = input.tasks.slice(0, 3).map((t) => {
      const workers = t.workerNames.length > 0 ? ` (${t.workerNames.join(", ")})` : "";
      return `· ${t.siteName} ${t.title}${workers}`;
    });
    const more = input.tasks.length > 3 ? `\n· 외 ${input.tasks.length - 3}건` : "";
    sections.push(`[오늘 공사 ${input.tasks.length}건]\n${lines.join("\n")}${more}`);
  }

  if (input.payments.length > 0) {
    const totalAmount = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const lines = input.payments.slice(0, 3).map(
      (p) => `· ${p.siteName} ${p.stageLabel} ${formatManwon(p.amount)} — ${dueLabel(p.overdueDays)}`
    );
    const more = input.payments.length > 3 ? `\n· 외 ${input.payments.length - 3}건` : "";
    sections.push(
      `[받을 돈 ${formatManwon(totalAmount)}]\n${lines.join("\n")}${more}`
    );
  }

  if (input.staleQuoteCount > 0) {
    sections.push(`[답 없는 견적 ${input.staleQuoteCount}건]\n앱에서 확인 후 한 번 더 연락해 보세요.`);
  }

  if (sections.length === 0) return null;

  return `${input.dateLabel} 아침 브리핑\n\n${sections.join("\n\n")}`;
}
