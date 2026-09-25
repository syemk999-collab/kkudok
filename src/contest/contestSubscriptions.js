import { createMockSubscriptions } from "../data/subscriptionData.js";

export const CONTEST_CANCELLATION_SUBSCRIPTION_ID = "seed-naverplus";

// The cancellation example belongs only to the isolated contest profile.
// The price is illustrative; the experience does not compare or promise savings from it.
export function createContestSubscriptions(scenario = null) {
  const subscriptions = createMockSubscriptions().filter((subscription) => subscription.id !== "netflix");
  if (scenario !== "B") return subscriptions;

  return [
    ...subscriptions,
    {
      id: "naverplus",
      subscriptionId: CONTEST_CANCELLATION_SUBSCRIPTION_ID,
      name: "네이버플러스 멤버십",
      monogram: "네",
      category: "쇼핑",
      plan: "월간 · 체험용 예시",
      amount: 4900,
      paymentMethod: "체험용 예시",
      billingCycle: "매월",
      status: "active",
      dueDay: 15,
      cancelUrl: "https://nid.naver.com/membership/my",
      alertD1: false,
      alertD3: false,
      alertEnabled: false,
      renewalPending: false,
    },
  ];
}
