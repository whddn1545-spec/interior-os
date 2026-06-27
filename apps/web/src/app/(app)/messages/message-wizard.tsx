"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangleIcon, SendIcon, CheckCircleIcon } from "lucide-react";
import { previewMessage, sendMessage } from "./actions";

interface Worker { id: string; name: string; phone: string; tradesKo: string }
interface Customer { id: string; name: string; phone: string }
interface Site { id: string; name: string; customerId: string | null; trades: { id: string; name_ko: string }[] }

interface Props {
  workers: Worker[];
  sites: Site[];
  customers: Customer[];
}

type Step = "target" | "site" | "preview" | "done";
type MessageType =
  | "worker_notify"
  | "customer_progress"
  | "payment_request"
  | "work_done"
  | "custom";
type PaymentStage = "deposit" | "midterm" | "balance";
type WorkDoneVariant = "completed" | "warranty";

// 고객 대상 문자 종류 (작업자에게는 섭외·안내만 노출)
const CUSTOMER_MESSAGE_TYPES: ReadonlyArray<readonly [MessageType, string, string]> = [
  ["customer_progress", "공사 진행 알림", "공종·예정일은 선택 — 비워도 상호로 안내됩니다"],
  ["payment_request", "대금 청구", "계약금·중도금·잔금 입금 안내"],
  ["work_done", "완료·하자보수 안내", "공사 완료/하자보수 안내"],
  ["custom", "직접 입력", "내용을 직접 작성"],
];

const WORKER_MESSAGE_TYPES: ReadonlyArray<readonly [MessageType, string, string]> = [
  ["worker_notify", "섭외·안내 문자", "작업 일정, 주소, 비번 포함"],
  ["custom", "직접 입력", "내용을 직접 작성"],
];

const PAYMENT_STAGES: ReadonlyArray<readonly [PaymentStage, string]> = [
  ["deposit", "계약금"],
  ["midterm", "중도금"],
  ["balance", "잔금"],
];

// 날짜 입력이 필요한 문자 종류 (작업일/예정일)
function needsDate(t: MessageType): boolean {
  return t === "worker_notify" || t === "customer_progress" || t === "work_done";
}

export function MessageWizard({ workers, sites, customers }: Props) {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("target");
  const [targetType, setTargetType] = useState<"worker" | "customer">("worker");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [workDate, setWorkDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [messageType, setMessageType] = useState<MessageType>("worker_notify");
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("deposit");
  const [workDoneVariant, setWorkDoneVariant] = useState<WorkDoneVariant>("completed");
  const [customBody, setCustomBody] = useState("");
  const [preview, setPreview] = useState<{ body: string; maskedBody: string; targetName: string; targetPhone: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 견적/현장 화면에서 넘어온 컨텍스트(siteId/quoteId/customerId)를 미리 채운다.
  useEffect(() => {
    const siteId = searchParams.get("siteId");
    const customerId = searchParams.get("customerId");
    const workerId = searchParams.get("workerId");

    if (workerId) {
      setTargetType("worker");
      setSelectedWorkerId(workerId);
      setMessageType("worker_notify");
    } else if (customerId) {
      setTargetType("customer");
      setSelectedCustomerId(customerId);
      setMessageType("customer_progress");
    }

    if (siteId) {
      setSelectedSiteId(siteId);
      // 대상까지 정해졌다면 바로 현장 단계로 진입
      if (workerId || customerId) setStep("site");
    }
    // 최초 마운트 시 1회만 적용 (이후 사용자의 선택을 덮어쓰지 않도록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  // 고객 선택 시 해당 고객의 현장만 보여준다.
  const customerSites = selectedCustomerId
    ? sites.filter((s) => s.customerId === selectedCustomerId)
    : sites;
  const availableSites = targetType === "customer" ? customerSites : sites;
  const selectedId = targetType === "worker" ? selectedWorkerId : selectedCustomerId;

  async function loadPreview() {
    setError(null);

    const result = await previewMessage({
      targetType,
      targetId: selectedId,
      siteId: selectedSiteId,
      messageType,
      customBody,
      workDate: needsDate(messageType) ? workDate : undefined,
      tradeId: selectedTradeId || undefined,
      paymentStage: messageType === "payment_request" ? paymentStage : undefined,
      workDoneVariant: messageType === "work_done" ? workDoneVariant : undefined,
    });

    if (!result.ok) {
      setError(result.error);
    } else {
      setPreview(result.data);
      setStep("preview");
    }
  }

  function handleSend() {
    if (!preview) return;
    startTransition(async () => {
      const dateKey = needsDate(messageType) ? workDate : "";
      const stageKey = messageType === "payment_request" ? paymentStage : "";
      const variantKey = messageType === "work_done" ? workDoneVariant : "";
      const key = `${targetType}-${selectedId}-${selectedSiteId}-${dateKey}-${messageType}-${stageKey}${variantKey}`;
      const result = await sendMessage({
        targetType,
        targetId: selectedId,
        siteId: selectedSiteId || undefined,
        messageType,
        customBody: messageType === "custom" ? customBody : undefined,
        workDate: needsDate(messageType) ? workDate : undefined,
        tradeId: selectedTradeId || undefined,
        paymentStage: messageType === "payment_request" ? paymentStage : undefined,
        workDoneVariant: messageType === "work_done" ? workDoneVariant : undefined,
        channel: "sms",
        idempotencyKey: key,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setStep("done");
      }
    });
  }

  function reset() {
    setStep("target");
    setSelectedWorkerId("");
    setSelectedCustomerId("");
    setSelectedSiteId("");
    setSelectedTradeId("");
    setPreview(null);
    setError(null);
  }

  if (step === "done") {
    return (
      <div className="text-center py-12">
        <CheckCircleIcon size={64} className="mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">문자를 보냈어요!</h2>
        <p className="text-base text-gray-500 mb-6">{preview?.targetName}님에게 발송 완료</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white rounded-2xl px-8 py-4 text-lg font-semibold"
        >
          또 보내기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* 스텝 1: 대상 선택 */}
      <div className={`p-5 ${step !== "target" ? "opacity-50" : ""}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">① 누구에게 보낼까요?</h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => { setTargetType("worker"); setSelectedCustomerId(""); setSelectedSiteId(""); setMessageType("worker_notify"); }}
            className={`py-4 rounded-xl text-lg font-semibold border-2 ${
              targetType === "worker" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
            }`}
          >
            👷 작업자
          </button>
          <button
            onClick={() => { setTargetType("customer"); setSelectedWorkerId(""); setSelectedSiteId(""); setMessageType("customer_progress"); }}
            className={`py-4 rounded-xl text-lg font-semibold border-2 ${
              targetType === "customer" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
            }`}
          >
            👤 고객
          </button>
        </div>

        {targetType === "worker" && (
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900 focus:outline-none focus:border-blue-400"
          >
            <option value="">작업자 선택...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.tradesKo || "다능"})</option>
            ))}
          </select>
        )}

        {targetType === "customer" && (
          <select
            value={selectedCustomerId}
            onChange={(e) => { setSelectedCustomerId(e.target.value); setSelectedSiteId(""); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900 focus:outline-none focus:border-blue-400"
          >
            <option value="">고객 선택...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {step === "target" && selectedId && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">메시지 종류</h3>
            <div className="space-y-2">
              {(targetType === "worker" ? WORKER_MESSAGE_TYPES : CUSTOMER_MESSAGE_TYPES).map(([type, label, desc]) => (
                <button
                  key={type}
                  onClick={() => setMessageType(type)}
                  className={`w-full text-left p-4 rounded-xl border-2 ${
                    messageType === type ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <p className="text-base font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("site")}
              className="mt-4 w-full bg-blue-600 text-white rounded-2xl py-4 text-lg font-semibold"
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* 스텝 2: 현장 & 날짜 */}
      {step === "site" && (
        <div className="border-t border-gray-100 p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-4">② 어느 현장인가요?</h2>

          <div className="space-y-3">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900 focus:outline-none focus:border-blue-400"
            >
              <option value="">현장 선택...</option>
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {selectedSite && selectedSite.trades.length > 0 && (
              <select
                value={selectedTradeId}
                onChange={(e) => setSelectedTradeId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900 focus:outline-none focus:border-blue-400"
              >
                <option value="">공종 선택 (선택)...</option>
                {selectedSite.trades.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_ko}</option>
                ))}
              </select>
            )}

            {/* 진행 알림: 공종·예정일을 비워도 상호 기반 안내로 채워진다는 안내 */}
            {messageType === "customer_progress" && !selectedTradeId && (
              <p className="text-sm text-gray-500">
                공종·예정일을 비워두면 상호·대표자 이름으로 진행 안내 문구가
                자동으로 채워집니다.
              </p>
            )}

            {/* 대금 청구: 청구 단계 선택 */}
            {messageType === "payment_request" && (
              <div>
                <p className="text-base font-semibold text-gray-800 mb-2">청구 단계</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_STAGES.map(([stage, label]) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setPaymentStage(stage)}
                      className={`py-4 rounded-xl text-base font-semibold border-2 ${
                        paymentStage === stage
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  미수 금액과 입금 계좌가 자동으로 채워집니다.
                </p>
              </div>
            )}

            {/* 완료·하자보수: 종류 선택 */}
            {messageType === "work_done" && (
              <div>
                <p className="text-base font-semibold text-gray-800 mb-2">안내 종류</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["completed", "공사 완료"],
                    ["warranty", "하자보수"],
                  ] as const).map(([variant, label]) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setWorkDoneVariant(variant)}
                      className={`py-4 rounded-xl text-base font-semibold border-2 ${
                        workDoneVariant === variant
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 작업일/예정일 */}
            {needsDate(messageType) && (
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  {messageType === "worker_notify"
                    ? "작업 예정일"
                    : messageType === "work_done" && workDoneVariant === "warranty"
                      ? "방문 예정일 (선택)"
                      : "예정일 (선택)"}
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900 focus:outline-none focus:border-blue-400"
                />
              </div>
            )}

            {messageType === "custom" && (
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="보낼 내용을 입력하세요..."
                rows={4}
                maxLength={300}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:border-blue-400"
              />
            )}
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <button
              onClick={loadPreview}
              disabled={!selectedSiteId}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
            >
              미리보기 →
            </button>
            <button
              onClick={() => setStep("target")}
              className="w-full bg-gray-100 text-gray-700 rounded-2xl py-3 text-base font-medium"
            >
              ← 이전
            </button>
          </div>
        </div>
      )}

      {/* 스텝 3: 미리보기 + 발송 */}
      {step === "preview" && preview && (
        <div className="border-t border-gray-100 p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">③ 보낼 내용 확인</h2>
          <p className="text-base text-gray-500 mb-4">받는 사람: {preview.targetName} ({preview.targetPhone})</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-base text-gray-800 whitespace-pre-line">{preview.maskedBody}</p>
            {preview.body !== preview.maskedBody && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                <AlertTriangleIcon size={16} className="text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700">실제 발송 시 비번이 포함됩니다</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleSend}
              disabled={isPending}
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
            >
              <SendIcon size={22} />
              {isPending ? "발송 중..." : `${preview.targetName}님에게 보내기`}
            </button>
            <button
              onClick={() => setStep("site")}
              className="w-full bg-gray-100 text-gray-700 rounded-2xl py-3 text-base font-medium"
            >
              ← 수정하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
