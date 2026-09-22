import { useCallback, useState } from "react";

const STORAGE_KEY = "kkudok-contest-flow-v2";

const EMPTY_FLOW = {
  scenario: null,
  step: null,
  parsedPayment: null,
  addedSubscriptionId: null,
  ocrResult: null,
};

function readInitial() {
  if (typeof window === "undefined") return EMPTY_FLOW;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved && (saved.scenario === "A" || saved.scenario === "B")) {
      return { ...EMPTY_FLOW, ...saved };
    }
  } catch {}
  return EMPTY_FLOW;
}

export function useContestFlow() {
  const [flow, setFlowState] = useState(readInitial);

  const setFlow = useCallback((next) => {
    setFlowState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      const normalized = { ...EMPTY_FLOW, ...value };
      if (typeof window !== "undefined") {
        if (normalized.scenario) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
      return normalized;
    });
  }, []);

  const startScenario = useCallback((scenario) => {
    setFlow({
      ...EMPTY_FLOW,
      scenario,
      step: scenario === "A" ? "A1" : "B1",
    });
  }, [setFlow]);

  const setStep = useCallback((step, patch = {}) => {
    setFlow((current) => ({ ...current, ...patch, step }));
  }, [setFlow]);

  const reset = useCallback(() => setFlow(EMPTY_FLOW), [setFlow]);

  return {
    flow,
    active: Boolean(flow.scenario),
    startScenario,
    setStep,
    reset,
  };
}

export const CONTEST_FLOW_STORAGE_KEY = STORAGE_KEY;
