import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kkudok-contest-flow-v2";
const HISTORY_KEY = "kkudokContestFlow";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const previous = window.history.state;
    const state = previous && typeof previous === "object" ? previous : {};
    window.history.replaceState({ ...state, [HISTORY_KEY]: flow }, "", window.location.href);
  }, [flow]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restore = (event) => {
      const previous = event.state?.[HISTORY_KEY];
      if (!previous) return;
      const restored = { ...EMPTY_FLOW, ...previous };
      setFlowState(restored);
      if (restored.scenario) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

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
    const next = {
      ...EMPTY_FLOW,
      scenario,
      step: scenario === "A" ? "A1" : "B1",
    };
    if (typeof window !== "undefined" && window.location.hash.startsWith("#/contest")) {
      const previous = window.history.state;
      const state = previous && typeof previous === "object" ? previous : {};
      window.history.pushState({ ...state, [HISTORY_KEY]: next }, "", window.location.href);
    }
    setFlow(next);
  }, [setFlow]);

  const setStep = useCallback((step, patch = {}) => {
    if (
      typeof window !== "undefined" &&
      ["A2", "B2"].includes(step) &&
      window.location.hash.startsWith("#/contest")
    ) {
      const previous = window.history.state;
      const state = previous && typeof previous === "object" ? previous : {};
      const current = state[HISTORY_KEY] || EMPTY_FLOW;
      if (current.step !== step) {
        window.history.pushState(
          { ...state, [HISTORY_KEY]: { ...current, ...patch, step } },
          "",
          window.location.href,
        );
      }
    }
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
