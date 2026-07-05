import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** DB 단위 코드 → 한글 표기 ("24pyeong" 노출 방지) */
const UNIT_LABEL: Record<string, string> = {
  pyeong: "평",
  m2: "㎡",
  m: "m",
  ea: "개",
  set: "세트",
  day: "일",
};

export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return "";
  return UNIT_LABEL[unit] ?? unit;
}
