import { z } from "zod";

/** 고객 생성 스키마 */
export const createCustomerSchema = z.object({
  /** 고객명 — 최소 2자 이상 */
  name: z.string().min(2, "고객명은 최소 2자 이상이어야 합니다."),
  /** 전화번호 — 010-으로 시작, 숫자와 하이픈만 허용 */
  phone: z
    .string()
    .regex(/^010-[\d-]+$/, "전화번호는 010-으로 시작하고 숫자와 하이픈만 포함해야 합니다."),
});

/** 현장 생성 스키마 */
export const createSiteSchema = z.object({
  /** 현장명 */
  name: z.string().min(1, "현장명을 입력해주세요."),
  /** 주소 */
  address: z.string().min(1, "주소를 입력해주세요."),
  /** 면적 (평수) — 1~1000 */
  areaPyeong: z
    .number()
    .min(1, "면적은 최소 1평 이상이어야 합니다.")
    .max(1000, "면적은 최대 1000평 이하여야 합니다."),
  /** 난이도 */
  difficulty: z.enum(["easy", "normal", "hard"], {
    errorMap: () => ({ message: "난이도는 easy, normal, hard 중 하나여야 합니다." }),
  }),
});

/** 견적 항목 초안 스키마 */
export const quoteItemDraftSchema = z.object({
  /** 공종 ID */
  tradeId: z.string().min(1, "공종 ID를 입력해주세요."),
  /** 수량 — 0 초과 */
  quantity: z.number().gt(0, "수량은 0보다 커야 합니다."),
  /** 자재 단가 — 0 이상 */
  materialUnitPrice: z.number().gte(0, "자재 단가는 0 이상이어야 합니다."),
  /** 일당 — 0 이상 */
  laborDayRate: z.number().gte(0, "일당은 0 이상이어야 합니다."),
  /** 단위당 기준 작업일 — 0 초과 */
  defaultDaysPerUnit: z.number().gt(0, "단위당 기준 작업일은 0보다 커야 합니다."),
});

/** 메시지 발송 스키마 */
export const sendMessageSchema = z.object({
  /** 발송 대상 유형 */
  targetType: z.enum(["customer", "worker"], {
    errorMap: () => ({ message: "발송 대상은 customer 또는 worker 여야 합니다." }),
  }),
  /** 발송 대상 ID */
  targetId: z.string().min(1, "발송 대상 ID를 입력해주세요."),
  /** 현장 ID */
  siteId: z.string().min(1, "현장 ID를 입력해주세요."),
  /** 발송 채널 */
  channel: z.enum(["sms", "alimtalk"], {
    errorMap: () => ({ message: "채널은 sms 또는 alimtalk 여야 합니다." }),
  }),
  /** 메시지 본문 — 최대 90자 */
  body: z.string().max(90, "메시지 본문은 최대 90자 이하여야 합니다."),
});

/** 타입 추출 */
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type QuoteItemDraftInput = z.infer<typeof quoteItemDraftSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
