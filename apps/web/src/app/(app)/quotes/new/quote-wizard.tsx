"use client";

import { useState } from "react";
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
  distanceFactor?: number;
  difficultyFactor?: number;
  areaPyeong?: number;
  items?: QuoteItemDraft[];
  quoteId?: string;
  total?: number;
}

const STEP_LABELS = ["고객", "현장", "공종", "확인", "완료"];

export function QuoteWizard() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>({});

  function updateState(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

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
                        ? "bg-blue-600 text-white"
                        : isDone
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : num}
                  </div>
                  <span className={`text-xs ${isActive ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 스텝 렌더링 */}
      {step === 1 && (
        <Step1Customer
          onNext={(customer) => {
            updateState({ customer });
            setStep(2);
          }}
        />
      )}

      {step === 2 && state.customer && (
        <Step2Site
          customerId={state.customer.id}
          onNext={(siteId, distanceFactor, difficultyFactor) => {
            updateState({ siteId, distanceFactor, difficultyFactor });
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && state.siteId && (
        <Step3Trades
          distanceFactor={state.distanceFactor ?? 1.0}
          difficultyFactor={state.difficultyFactor ?? 1.1}
          defaultAreaPyeong={state.areaPyeong ?? 33}
          onNext={(items) => {
            updateState({ items });
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && state.siteId && state.items && (
        <Step4Review
          siteId={state.siteId}
          items={state.items}
          distanceFactor={state.distanceFactor ?? 1.0}
          difficultyFactor={state.difficultyFactor ?? 1.1}
          onConfirmed={(quoteId, total) => {
            updateState({ quoteId, total });
            setStep(5);
          }}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && state.quoteId && state.total !== undefined && (
        <Step5Done quoteId={state.quoteId} total={state.total} />
      )}
    </div>
  );
}
