"use client";

import { useState, useEffect } from "react";
import { Step1Customer } from "./steps/step-1-customer";
import { Step2Site } from "./steps/step-2-site";
import { Step3Trades } from "./steps/step-3-trades";
import { Step4Review } from "./steps/step-4-review";
import { Step5Done } from "./steps/step-5-done";
import type { QuoteItemDraft } from "./actions";

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  customer?: { id: string; name: string; phone: string };
  siteId?: string;
  siteName?: string;
  distanceFactor?: number;
  difficultyFactor?: number;
  areaPyeong?: number;
  items?: QuoteItemDraft[];
  quoteId?: string;
  total?: number;
}

const STEP_LABELS = ["고객", "현장", "공종", "확인", "완료"];
const DRAFT_KEY = "quote_wizard_draft";

function loadDraft(): { step: Step; state: WizardState } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { step: 1, state: {} };
    const parsed = JSON.parse(raw) as { step: Step; state: WizardState };
    // 완료 단계 draft는 버림
    if (parsed.step === 5) return { step: 1, state: {} };
    return parsed;
  } catch {
    return { step: 1, state: {} };
  }
}

function saveDraft(step: Step, state: WizardState) {
  try {
    if (step === 5) {
      localStorage.removeItem(DRAFT_KEY);
    } else {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, state }));
    }
  } catch {
    // 스토리지 꽉 찬 경우 무시
  }
}

interface QuoteWizardProps {
  initialCustomer?: { id: string; name: string; phone: string };
}

export function QuoteWizard({ initialCustomer }: QuoteWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>({});
  const [hydrated, setHydrated] = useState(false);

  // SSR 후 클라이언트에서 draft 복원
  useEffect(() => {
    const { step: savedStep, state: savedState } = loadDraft();

    // 고객 상세 화면에서 "새 견적"으로 들어온 경우(initialCustomer 존재)
    if (initialCustomer) {
      // 저장된 draft가 같은 고객이면 그대로 이어쓰기
      const sameCustomer = savedState.customer?.id === initialCustomer.id;
      if (sameCustomer) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep(savedStep);
        setState(savedState);
      } else {
        // draft가 없거나 다른 고객이면 파라미터 고객 우선 → 곧장 현장(2단계)으로
        setStep(2);
        setState({ customer: initialCustomer });
        saveDraft(2, { customer: initialCustomer });
      }
      setHydrated(true);
      return;
    }

    setStep(savedStep);
    setState(savedState);
    setHydrated(true);
  }, [initialCustomer]);

  function updateState(patch: Partial<WizardState>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(step, next);
      return next;
    });
  }

  function goToStep(next: Step, patch?: Partial<WizardState>) {
    setState((prev) => {
      const nextState = patch ? { ...prev, ...patch } : prev;
      saveDraft(next, nextState);
      return nextState;
    });
    setStep(next);
  }

  if (!hydrated) return null;

  return (
    <div className="max-w-lg mx-auto">
      {/* 진행 단계 표시 */}
      {step < 5 && (
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const num = (i + 1) as Step;
              const isActive = num === step;
              const isDone = num < step;
              return (
                <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isActive
                        ? "bg-primary text-white"
                        : isDone
                        ? "bg-profit/100 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : num}
                  </div>
                  <span
                    className={`text-xs ${
                      isActive ? "text-primary font-semibold" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${isDone ? "bg-green-400" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 이어쓰기 중 표시 */}
          {step > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-400">임시저장 복원됨</p>
              <button
                onClick={() => {
                  localStorage.removeItem(DRAFT_KEY);
                  setStep(1);
                  setState({});
                }}
                className="text-xs text-red-400 underline"
              >
                처음부터
              </button>
            </div>
          )}
        </div>
      )}

      {/* 스텝 렌더링 */}
      {step === 1 && (
        <Step1Customer
          initialCustomer={state.customer}
          onNext={(customer) => goToStep(2, { customer })}
        />
      )}

      {step === 2 && state.customer && (
        <Step2Site
          customerId={state.customer.id}
          onNext={(siteId, distanceFactor, difficultyFactor, areaPyeong, siteName) =>
            goToStep(3, { siteId, siteName, distanceFactor, difficultyFactor, areaPyeong })
          }
          onBack={() => goToStep(1)}
        />
      )}

      {step === 3 && state.siteId && (
        <Step3Trades
          distanceFactor={state.distanceFactor ?? 1.0}
          difficultyFactor={state.difficultyFactor ?? 1.1}
          defaultAreaPyeong={state.areaPyeong ?? 33}
          onNext={(items) => goToStep(4, { items })}
          onBack={() => goToStep(2)}
        />
      )}

      {step === 4 && state.siteId && state.items && (
        <Step4Review
          siteId={state.siteId}
          siteName={state.siteName}
          items={state.items}
          distanceFactor={state.distanceFactor ?? 1.0}
          difficultyFactor={state.difficultyFactor ?? 1.1}
          areaPyeong={state.areaPyeong ?? 33}
          onConfirmed={(quoteId, total) => goToStep(5, { quoteId, total })}
          onBack={() => goToStep(3)}
        />
      )}

      {step === 5 && state.quoteId && state.total !== undefined && (
        <Step5Done
          quoteId={state.quoteId}
          total={state.total}
          customerId={state.customer?.id}
          siteId={state.siteId}
        />
      )}
    </div>
  );
}
