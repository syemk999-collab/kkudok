import test from "node:test";
import assert from "node:assert/strict";
import { getProviderCancellation, identifyCancellationProvider } from "../src/lib/providerCancellation.js";

const chatgpt = { id: "chatgpt", name: "ChatGPT Plus", cancelUrl: "https://chatgpt.com/#settings/Subscription" };
const claude = { id: "claude-pro", name: "Claude Pro", cancelUrl: "https://claude.ai/settings/billing" };

test("결제처를 모르면 저장된 일반 링크로 건너뛰지 않고 먼저 확인하도록 안내한다", () => {
  for (const subscription of [chatgpt, claude]) {
    const guide = getProviderCancellation(subscription);
    assert.equal(guide.purchaseSource, "unknown");
    assert.equal(guide.cancelUrl, "");
    assert.match(guide.guideSteps[0].description, /결제처/);
  }
});

test("웹 결제는 각 서비스의 공식 경로와 확인 단계를 제공한다", () => {
  const gpt = getProviderCancellation(chatgpt, "web");
  const claudeGuide = getProviderCancellation(claude, "web");
  assert.equal(gpt.cancelUrl, "https://chatgpt.com/settings/billing");
  assert.equal(claudeGuide.cancelUrl, "https://claude.ai/settings/billing");
  assert.match(gpt.guideSteps[2].description, /플랜 취소.*취소/);
  assert.match(claudeGuide.guideSteps[1].description, /설정.*청구/);
  assert.ok(gpt.guideSteps.every((step) => !/자동.*해지/.test(step.description)));
});

test("Google Play와 App Store에서 결제했다면 서비스 웹 설정으로 보내지 않는다", () => {
  for (const subscription of [chatgpt, claude]) {
    const play = getProviderCancellation(subscription, "google-play");
    const apple = getProviderCancellation(subscription, "app-store");
    assert.equal(new URL(play.cancelUrl).hostname, "play.google.com");
    assert.equal(new URL(apple.cancelUrl).hostname, "support.apple.com");
    assert.match(apple.notice, /iPhone/);
  }
});

test("관련 없는 구독과 네이버플러스의 안내를 바꾸지 않는다", () => {
  assert.equal(identifyCancellationProvider({ id: "naverplus", name: "네이버플러스 멤버십" }), null);
  assert.equal(getProviderCancellation({ id: "netflix", name: "Netflix" }, "web"), null);
});
