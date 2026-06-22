import "server-only";

export type CustomerGrade = "vip" | "gold" | "normal" | "dormant";

export interface CustomerGradeResult {
  customerId: string;
  recommendedGrade: CustomerGrade;
  reason: string;
}
