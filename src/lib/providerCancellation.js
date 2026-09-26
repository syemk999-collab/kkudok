// Official billing routes for subscriptions purchased directly from the provider.
// Purchase source is not inferred from a saved payment method or subscription name.
const PROVIDERS = {
  chatgpt: {
    name: "ChatGPT Plus",
    webUrl: "https://chatgpt.com/settings/billing",
    helpUrl: "https://help.openai.com/en/articles/7232927-canceling-your-chatgpt-subscription",
    webSteps: [
      ["가입 계정으로 로그인", "ChatGPT를 결제한 계정으로 로그인하세요."],
      ["결제 화면 확인", "[설정] → [결제]에서 현재 플랜을 확인하세요. 웹 결제 계정이라면 이 화면으로 바로 연결됩니다."],
      ["플랜 취소 버튼 확인", "[플랜 취소] 카드의 [취소] 버튼을 확인하세요. 꾸독은 이 버튼이나 이후 확인 버튼을 대신 누르지 않습니다."],
      ["상태 확인", "갱신이 중단되었는지 공식 청구 화면에서 확인하세요."],
    ],
  },
  claude: {
    name: "Claude Pro",
    webUrl: "https://claude.ai/settings/billing",
    helpUrl: "https://support.claude.com/ko/articles/8325617-pro-%EB%98%90%EB%8A%94-max-%EA%B5%AC%EB%8F%85-%EC%B7%A8%EC%86%8C",
    webSteps: [
      ["가입 계정으로 로그인", "Claude를 결제한 계정으로 로그인하세요."],
      ["설정의 청구 열기", "왼쪽 아래 이름 또는 이니셜에서 [설정] → [청구]로 이동하세요."],
      ["취소 버튼 확인", "[청구] 화면의 [취소]를 찾으세요. 마지막 결정은 직접 해주세요."],
      ["상태 확인", "갱신이 중단되었는지 공식 청구 화면에서 확인하세요."],
    ],
  },
};

const PLAY_URL = "https://play.google.com/store/account/subscriptions";
const APPLE_HELP_URL = "https://support.apple.com/ko-kr/118428";

function steps(items) {
  return items.map(([title, description], index) => ({ stepNumber: index + 1, title, description }));
}

export function identifyCancellationProvider(subscription = {}) {
  const id = String(subscription.id || subscription.serviceId || "").toLowerCase();
  const name = String(subscription.name || "").toLowerCase();
  if (id === "chatgpt" || name.startsWith("chatgpt")) return "chatgpt";
  if (id === "claude-pro" || id === "claude" || name.startsWith("claude")) return "claude";
  return null;
}

export function getProviderCancellation(subscription, purchaseSource = "unknown") {
  const id = identifyCancellationProvider(subscription);
  if (!id) return null;
  const provider = PROVIDERS[id];
  const name = String(subscription?.name || provider.name);
  const common = { id, name, purchaseSource, helpUrl: provider.helpUrl };

  if (purchaseSource === "web") {
    return {
      ...common, cancelUrl: provider.webUrl, guideSteps: steps(provider.webSteps),
      notice: "웹에서 직접 결제한 계정의 경로예요. 앱 마켓에서 결제했다면 결제한 마켓에서 취소해야 합니다.",
    };
  }
  if (purchaseSource === "google-play") {
    return {
      ...common, cancelUrl: PLAY_URL,
      guideSteps: steps([
        ["결제 계정 확인", "구독을 결제한 Google 계정으로 로그인하세요."],
        ["Google Play 정기 결제", `정기 결제 목록에서 ${name}을 선택하세요.`],
        ["취소 여부 결정", "[정기 결제 취소]를 선택하고 안내를 확인하세요. 마지막 결정은 직접 해주세요."],
      ]),
      notice: "Google Play에서 결제한 구독에만 적용됩니다. 다른 결제 경로라면 목록에 보이지 않아요.",
    };
  }
  if (purchaseSource === "app-store") {
    return {
      ...common, cancelUrl: APPLE_HELP_URL,
      guideSteps: steps([
        ["Apple 계정 확인", "구독을 결제한 Apple 계정을 확인하세요."],
        ["iPhone 설정 열기", `iPhone [설정] → 이름 → [구독]에서 ${name}을 찾으세요.`],
        ["취소 여부 결정", "[구독 취소]를 직접 선택하고 상태를 확인하세요. 이 링크는 Apple 공식 안내예요."],
      ]),
      notice: "App Store 결제는 iPhone의 구독 설정에서 취소합니다. 꾸독 안에서 Apple 화면의 버튼 위치를 읽지 않아요.",
    };
  }
  return {
    ...common, cancelUrl: "", purchaseSource: "unknown",
    guideSteps: steps([["결제한 곳 확인", "영수증이나 청구 내역에서 결제처가 웹, Google Play, App Store 중 어디인지 확인하고 아래에서 선택하세요."]]),
    notice: "결제처를 모르면 해지 경로를 정확히 안내할 수 없어요. 먼저 영수증의 결제처를 확인해주세요.",
  };
}
