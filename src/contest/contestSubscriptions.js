export const CONTEST_CANCELLATION_SUBSCRIPTION_ID = "seed-naverplus";

// A/B begin empty: the only subscription in either flow must come from the
// user's confirmed parser/OCR result. The optional cancellation example is
// created only when the user explicitly chooses that separate tutorial.
export function createContestSubscriptions(scenario = null) {
  if (scenario !== "C") return [];

  return [
    {
      id: "naverplus",
      subscriptionId: CONTEST_CANCELLATION_SUBSCRIPTION_ID,
      name: "네이버플러스 멤버십",
      monogram: "네",
      category: "쇼핑",
      plan: "해지 경로 체험용",
      amount: null,
      billingCycle: "정보 없음",
      status: "example",
      cancelUrl: "https://nid.naver.com/membership/subscribe?m=checkCancel",
      alertD1: false,
      alertD3: false,
      alertEnabled: false,
      renewalPending: false,
    },
  ];
}
