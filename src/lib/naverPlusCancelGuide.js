// The subscriber cancellation-entry URL was opened in a signed-in NAVER account
// on 2026-09-26. NAVER appends a session-specific token after login; never store it.
export const NAVER_PLUS_CANCEL_URL = "https://nid.naver.com/membership/subscribe?m=checkCancel";
const NAVER_PLUS_OLD_URL = "https://nid.naver.com/membership/my";

// The cancellation entry opens with the recurring-payment section collapsed.
// Only the member can choose the final cancellation action.
export const NAVER_PLUS_CANCEL_STEPS = [
  {
    stepNumber: 1,
    title: "정기결제 해지 펼치기",
    description: "가입 계정으로 로그인한 뒤 이번 이용 기간을 확인하고 [정기결제 해지]를 펼치세요. [멤버십 즉시 종료]와는 다릅니다.",
  },
  {
    stepNumber: 2,
    title: "해지하기",
    description: "이용 종료 예정일과 유의사항을 확인한 뒤 [해지하기]를 직접 누르세요. 네이버의 완료 화면까지 확인해야 합니다.",
  },
];

export function isNaverPlusSubscription(subscription = {}) {
  const id = String(subscription.serviceId || subscription.id || "").toLowerCase();
  return id === "naverplus" || id === "naver" ||
    String(subscription.name || "").includes("네이버플러스");
}

// Existing subscriptions may retain the old /membership/my URL in storage.
// Resolve it at opening time without modifying user data or unrelated services.
export function getCancelUrl(subscription = {}) {
  const url = subscription.cancelUrl || "";
  if (!isNaverPlusSubscription(subscription)) return url;
  // Preserve a deliberately configured alternative (e.g. another billing provider).
  if (!url || url === NAVER_PLUS_OLD_URL) return NAVER_PLUS_CANCEL_URL;
  try {
    const parsed = new URL(url);
    if (parsed.origin === "https://nid.naver.com" &&
        parsed.pathname === "/membership/subscribe" &&
        parsed.searchParams.get("m") === "checkCancel") {
      return NAVER_PLUS_CANCEL_URL;
    }
  } catch {
    // An unrelated user-provided link is left as-is for the normal fallback.
  }
  return url;
}

export function usesNaverPlusCancelEntry(subscription = {}) {
  return isNaverPlusSubscription(subscription) &&
    getCancelUrl(subscription) === NAVER_PLUS_CANCEL_URL;
}
