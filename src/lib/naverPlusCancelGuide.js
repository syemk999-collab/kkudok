// NAVER's published path for stopping the next recurring payment.
// Keep the final action with the member, and distinguish it from immediate termination.
export const NAVER_PLUS_CANCEL_STEPS = [
  {
    stepNumber: 1,
    title: "설정",
    description: "네이버플러스 마이 멤버십 오른쪽 위 [설정]을 누르세요.",
  },
  {
    stepNumber: 2,
    title: "네이버플러스 멤버십 관리",
    description: "설정 화면에서 [네이버플러스 멤버십 관리]를 누르세요.",
  },
  {
    stepNumber: 3,
    title: "네이버플러스 멤버십 해지하기",
    description: "멤버십 관리 화면에서 [네이버플러스 멤버십 해지하기]를 누르세요.",
  },
  {
    stepNumber: 4,
    title: "정기결제 해지",
    description: "이번 이용 기간을 확인한 뒤 [정기결제 해지]를 누르세요.",
  },
  {
    stepNumber: 5,
    title: "해지하기",
    description: "최종 확인 화면의 [해지하기]는 사용자가 직접 눌러야 실제 해지가 완료됩니다.",
  },
];

export function isNaverPlusSubscription(subscription = {}) {
  const id = String(subscription.serviceId || subscription.id || "").toLowerCase();
  return id === "naverplus" || id === "naver" ||
    String(subscription.name || "").includes("네이버플러스");
}
