import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  requiresHumanGate,
} from "../quoteMachine.js";

describe("canTransition", () => {
  it("quote: draft → confirmed 허용", () => {
    expect(canTransition("quote", "draft", "confirmed")).toBe(true);
  });

  it("quote: confirmed → sent 허용", () => {
    expect(canTransition("quote", "confirmed", "sent")).toBe(true);
  });

  it("quote: sent → accepted 허용", () => {
    expect(canTransition("quote", "sent", "accepted")).toBe(true);
  });

  it("quote: sent → rejected 허용", () => {
    expect(canTransition("quote", "sent", "rejected")).toBe(true);
  });

  it("quote: sent → draft 불허", () => {
    expect(canTransition("quote", "sent", "draft")).toBe(false);
  });

  it("quote: accepted → draft 불허", () => {
    expect(canTransition("quote", "accepted", "draft")).toBe(false);
  });

  it("contract: draft → confirmed 허용", () => {
    expect(canTransition("contract", "draft", "confirmed")).toBe(true);
  });

  it("contract: confirmed → signed 허용", () => {
    expect(canTransition("contract", "confirmed", "signed")).toBe(true);
  });

  it("contract: signed → draft 불허", () => {
    expect(canTransition("contract", "signed", "draft")).toBe(false);
  });

  it("message: queued → sent 허용", () => {
    expect(canTransition("message", "queued", "sent")).toBe(true);
  });

  it("message: queued → failed 허용", () => {
    expect(canTransition("message", "queued", "failed")).toBe(true);
  });

  it("message: sent → failed 불허", () => {
    expect(canTransition("message", "sent", "failed")).toBe(false);
  });
});

describe("transition", () => {
  it("유효한 전이: draft → confirmed 반환", () => {
    expect(transition("quote", "draft", "confirmed")).toBe("confirmed");
  });

  it("유효한 전이: contract confirmed → signed 반환", () => {
    expect(transition("contract", "confirmed", "signed")).toBe("signed");
  });

  it("유효한 전이: message queued → sent 반환", () => {
    expect(transition("message", "queued", "sent")).toBe("sent");
  });

  it("유효하지 않은 전이: sent → draft 에러 throw", () => {
    expect(() => transition("quote", "sent", "draft")).toThrow(
      "유효하지 않은 상태 전이",
    );
  });

  it("유효하지 않은 전이: message sent → failed 에러 throw", () => {
    expect(() => transition("message", "sent", "failed")).toThrow(
      "유효하지 않은 상태 전이",
    );
  });

  it("유효하지 않은 전이: contract signed → draft 에러 throw", () => {
    expect(() => transition("contract", "signed", "draft")).toThrow(
      "유효하지 않은 상태 전이",
    );
  });
});

describe("requiresHumanGate", () => {
  it("confirmed → true", () => {
    expect(requiresHumanGate("confirmed")).toBe(true);
  });

  it("signed → true", () => {
    expect(requiresHumanGate("signed")).toBe(true);
  });

  it("draft → false", () => {
    expect(requiresHumanGate("draft")).toBe(false);
  });

  it("sent → false", () => {
    expect(requiresHumanGate("sent")).toBe(false);
  });

  it("accepted → false", () => {
    expect(requiresHumanGate("accepted")).toBe(false);
  });
});
