// resources/js/components/Wizard.jsx
import React, { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Wizard
 * - Reusable stepper for multi-step flows.
 *
 * Props:
 * - steps: Array<{
 *     key: string;
 *     title: string;
 *     render: (ctx: {data, setData, stepIndex}) => React.ReactNode;
 *     canNext?: (data) => boolean;     // optional gate before going next
 *   }>
 * - initialData?: any                 // shared cross-step state
 * - initialStep?: number              // default 0
 * - onFinish?: (data) => void         // called on final "Finish"
 * - labels?: { back?, next?, finish? }
 *
 * Usage:
 * <Wizard steps={[...]} onFinish={(data)=>{}} />
 */
export default function Wizard({
  steps,
  initialData = {},
  initialStep = 0,
  onFinish,
  onChange, // optional callback to notify parent of data changes
  onSetDataRef, // optional callback to receive internal setData function
  labels = { back: "Back", next: "Next", finish: "Finish" },
}) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  // Initialize data once from initialData; do not auto-reset on prop changes.
  // Consumers needing to force a reset should remount the Wizard or add a reset key.
  const [data, setData] = useState(initialData);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const current = useMemo(() => steps[stepIndex] || null, [steps, stepIndex]);
  const canGoNext = useMemo(() => {
    if (!current) return false;
    if (typeof current.canNext === "function") return !!current.canNext(data);
    return true; // default: allow
  }, [current, data]);

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (!canGoNext) {
      // give the current step a chance to show an explanation / popup when next is attempted
      try { if (current && typeof current.onInvalid === 'function') current.onInvalid({ data, setData: updateData, stepIndex }); } catch (e) { /* ignore */ }
      return;
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };
  const finish = async () => {
    if (!canGoNext) {
      try { if (current && typeof current.onInvalid === 'function') current.onInvalid({ data, setData: updateData, stepIndex }); } catch (e) { /* ignore */ }
      return;
    }

    // allow the current/last step to run a final validation before finish
    try {
      if (current && typeof current.onBeforeFinish === 'function') {
        const res = current.onBeforeFinish({ data, setData: updateData, stepIndex });
        // support async hooks returning a Promise<boolean>
        const resolved = res && typeof res.then === 'function' ? await res : res;
        // if the hook explicitly returns false, block finishing
        if (resolved === false) return;
      }
    } catch (e) { /* ignore */ }

    onFinish?.(data);
  };

  // Wrapped setter to allow steps to update data and notify parent via onChange
  const updateData = (payload) => {
    if (typeof payload === "function") {
      setData((prev) => {
        const next = payload(prev);
        try { if (typeof onChange === 'function') setTimeout(() => onChange(next), 0); } catch (e) { /* ignore */ }
        return next;
      });
    } else {
      setData((prev) => {
        const next = { ...prev, ...payload };
        try { if (typeof onChange === 'function') setTimeout(() => onChange(next), 0); } catch (e) { /* ignore */ }
        return next;
      });
    }
  };

  // expose setter to parent via callback (if provided)
  try { if (typeof onSetDataRef === 'function') onSetDataRef(updateData); } catch (e) { /* ignore */ }

  return (
    <div>
      {/* Step indicator */}
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <span>Wizard</span>
          </div>
        </div>
        <div className="wizard-steps">
          {steps.map((s, idx) => {
            const state = idx === stepIndex ? "active" : idx < stepIndex ? "done" : "";
            return (
              <div key={s.key} className={`wizard-step ${state}`} aria-label={s.title}>
                <span className="step-index">{idx + 1}</span>
                <span className="step-label">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
  {current && current.render({ data, setData: updateData, stepIndex })}

      {/* Nav */}
      <div className="wizard-nav">
        <button className="pill-btn" disabled={isFirst} onClick={goPrev}>
          <FiChevronLeft /> <span className="hide-sm">{labels.back}</span>
        </button>
        <div style={{ flex: 1 }} />
        {!isLast ? (
          <button
            className={`pill-btn primary ${!canGoNext ? 'disabled' : ''}`}
            aria-disabled={!canGoNext}
            onClick={goNext}
          >
              <span className="hide-sm">{labels.next}</span> <FiChevronRight />
          </button>
        ) : (
          <button
            className={`pill-btn primary ${!canGoNext ? 'disabled' : ''}`}
            aria-disabled={!canGoNext}
            onClick={finish}
          >
            {labels.finish}
          </button>
        )}
      </div>
    </div>
  );
}
