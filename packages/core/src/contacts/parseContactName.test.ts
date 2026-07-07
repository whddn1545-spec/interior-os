import { describe, it, expect } from "vitest";
import { parseContactName } from "./parseContactName";

describe("parseContactName", () => {
  it("공종이 앞에: '도배 곽상연'", () => {
    expect(parseContactName("도배 곽상연")).toEqual({ name: "곽상연", tradeCodes: ["wallpaper"] });
  });

  it("공종이 뒤에: '김반장 목공'", () => {
    expect(parseContactName("김반장 목공")).toEqual({ name: "김반장", tradeCodes: ["carpentry"] });
  });

  it("괄호 표기: '곽상연(타일)'", () => {
    expect(parseContactName("곽상연(타일)")).toEqual({ name: "곽상연", tradeCodes: ["tile"] });
  });

  it("동의어: 목수/페인트/장판", () => {
    expect(parseContactName("박목수").tradeCodes).toEqual(["carpentry"]);
    expect(parseContactName("페인트 이씨").tradeCodes).toEqual(["paint"]);
    expect(parseContactName("장판 최사장").tradeCodes).toEqual(["flooring"]);
  });

  it("복수 공종: '전기설비 김기사'", () => {
    const r = parseContactName("전기설비 김기사");
    expect(r.name).toBe("김기사");
    expect(r.tradeCodes).toEqual(expect.arrayContaining(["electric", "plumbing"]));
  });

  it("긴 키워드 우선: '입주청소 한사장' → cleanup 한 번만", () => {
    expect(parseContactName("입주청소 한사장")).toEqual({ name: "한사장", tradeCodes: ["cleanup"] });
  });

  it("공종 없음: 원본 유지", () => {
    expect(parseContactName("홍길동")).toEqual({ name: "홍길동", tradeCodes: [] });
  });

  it("공종 단어뿐이면 이름은 원본 유지", () => {
    expect(parseContactName("타일")).toEqual({ name: "타일", tradeCodes: ["tile"] });
  });

  it("빈 문자열", () => {
    expect(parseContactName("  ")).toEqual({ name: "", tradeCodes: [] });
  });
});
