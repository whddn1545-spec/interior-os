/**
 * 연락처 이름에서 공종 키워드를 추출한다.
 * 사장님들은 연락처를 "도배 곽상연", "곽상연(타일)", "김반장 목공" 식으로 저장하는 관행이 있다.
 * 순수 함수 — 매칭된 공종 코드 목록과, 공종 단어를 제거한 나머지 이름을 돌려준다.
 */

/** 공종 코드 → 연락처에서 흔히 쓰는 표기들 (긴 단어 우선 매칭) */
const TRADE_KEYWORDS: Record<string, string[]> = {
  demolition: ["철거"],
  electric: ["전기"],
  plumbing: ["배관", "설비"],
  carpentry: ["목공", "목수"],
  tile: ["타일"],
  flooring: ["바닥", "장판", "마루", "강마루"],
  wallpaper: ["도배"],
  paint: ["도장", "페인트", "페인트칠"],
  furniture: ["가구", "씽크", "싱크"],
  light: ["조명"],
  curtain: ["커튼", "블라인드"],
  cleanup: ["입주청소", "청소"],
};

export interface ParsedContactName {
  /** 공종 단어를 걷어낸 사람 이름 (걷어낼 게 없으면 원본 그대로) */
  name: string;
  /** 이름에서 인식된 공종 코드들 */
  tradeCodes: string[];
}

export function parseContactName(raw: string): ParsedContactName {
  const original = raw.trim();
  if (!original) return { name: "", tradeCodes: [] };

  const tradeCodes: string[] = [];
  let remaining = original;

  // 긴 키워드부터 매칭해 "입주청소"가 "청소"보다 먼저 잡히게 한다
  const entries = Object.entries(TRADE_KEYWORDS)
    .flatMap(([code, words]) => words.map((w) => ({ code, word: w })))
    .sort((a, b) => b.word.length - a.word.length);

  for (const { code, word } of entries) {
    if (remaining.includes(word)) {
      if (!tradeCodes.includes(code)) tradeCodes.push(code);
      remaining = remaining.split(word).join(" ");
    }
  }

  // 남은 문자열 정리: 구분 기호·중복 공백 제거
  const cleaned = remaining.replace(/[()\[\]{}\-_/·,]+/g, " ").replace(/\s+/g, " ").trim();

  return {
    // 공종 단어만 있는 연락처("타일")면 이름이 비므로 원본을 유지
    name: cleaned || original,
    tradeCodes,
  };
}
