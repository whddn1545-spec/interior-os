/** 견적 상태 */
export type QuoteStatus = "draft" | "confirmed" | "sent" | "accepted" | "rejected";

/** 계약 상태 */
export type ContractStatus = "draft" | "confirmed" | "signed";

/** 메시지 상태 */
export type MessageStatus = "queued" | "sent" | "failed";

type Kind = "quote" | "contract" | "message";

/** 허용된 전이 맵: 현재 상태 → 다음 상태 목록 */
const TRANSITIONS: Record<Kind, Record<string, readonly string[]>> = {
  quote: {
    draft: ["confirmed", "draft"],
    confirmed: ["sent", "draft"],
    sent: ["accepted", "rejected"],
    accepted: [],
    rejected: [],
  },
  contract: {
    draft: ["confirmed", "draft"],
    confirmed: ["signed", "draft"],
    signed: [],
  },
  message: {
    queued: ["sent", "failed"],
    sent: [],
    failed: [],
  },
};

/**
 * 유효한 전이인지 확인합니다.
 */
export function canTransition(
  kind: Kind,
  current: string,
  next: string,
): boolean {
  const map = TRANSITIONS[kind];
  const allowed = map[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

/**
 * 상태 전이를 실행합니다. 유효하지 않은 전이는 Error를 던집니다.
 */
export function transition<T extends string>(
  kind: Kind,
  current: T,
  next: T,
): T {
  if (!canTransition(kind, current, next)) {
    throw new Error(
      `[${kind}] 유효하지 않은 상태 전이: "${current}" → "${next}"`,
    );
  }
  return next;
}

/**
 * 사람 확정이 필요한 상태인지 확인합니다.
 * "confirmed" 와 "signed" 상태만 true를 반환합니다.
 */
export function requiresHumanGate(next: string): boolean {
  return next === "confirmed" || next === "signed";
}
