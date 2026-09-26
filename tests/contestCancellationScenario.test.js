import test from "node:test";
import assert from "node:assert/strict";
import { createMockSubscriptions } from "../src/data/subscriptionData.js";
import {
  CONTEST_CANCELLATION_SUBSCRIPTION_ID,
  createContestSubscriptions,
} from "../src/contest/contestSubscriptions.js";
import { NAVER_PLUS_CANCEL_STEPS, NAVER_PLUS_CANCEL_URL, getCancelUrl, isNaverPlusSubscription, usesNaverPlusCancelEntry } from "../src/lib/naverPlusCancelGuide.js";

test("NaverPlus cancellation example exists only in contest scenario B", () => {
  const ordinary = createMockSubscriptions();
  const scenarioA = createContestSubscriptions("A");
  const scenarioB = createContestSubscriptions("B");

  assert.equal(ordinary.some(({ id }) => id === "naverplus"), false);
  assert.equal(scenarioA.some(({ id }) => id === "naverplus"), false);
  assert.equal(scenarioB.some(({ id }) => id === "netflix"), false);

  const naverPlus = scenarioB.find(({ subscriptionId }) => subscriptionId === CONTEST_CANCELLATION_SUBSCRIPTION_ID);
  assert.equal(naverPlus?.id, "naverplus");
  assert.equal(naverPlus?.cancelUrl, NAVER_PLUS_CANCEL_URL);
  assert.equal(naverPlus?.paymentMethod, "체험용 예시");
  assert.equal(naverPlus?.alertEnabled, false);
  assert.equal(scenarioB.find(({ id }) => id === "spotify")?.subscriptionId, "seed-spotify");
});

test("NaverPlus uses its official recurring-payment path and leaves completion to the user", () => {
  assert.equal(isNaverPlusSubscription({ id: "naverplus" }), true);
  assert.equal(isNaverPlusSubscription({ name: "네이버플러스 멤버십" }), true);
  assert.equal(isNaverPlusSubscription({ id: "spotify" }), false);
  assert.deepEqual(NAVER_PLUS_CANCEL_STEPS.map(({ stepNumber }) => stepNumber), [1, 2]);
  assert.match(NAVER_PLUS_CANCEL_STEPS[0].description, /정기결제 해지/);
  assert.match(NAVER_PLUS_CANCEL_STEPS[0].description, /즉시 종료/);
  assert.match(NAVER_PLUS_CANCEL_STEPS[1].description, /직접 누르세요/);
  assert.match(NAVER_PLUS_CANCEL_STEPS[1].description, /완료 화면/);
});

test("existing NaverPlus subscriptions open the verified entry without storing a session token", () => {
  const stale = { id: "naverplus", cancelUrl: "https://nid.naver.com/membership/my" };
  assert.equal(getCancelUrl(stale), NAVER_PLUS_CANCEL_URL);
  assert.equal(getCancelUrl({ name: "네이버플러스 멤버십" }), NAVER_PLUS_CANCEL_URL);
  assert.equal(NAVER_PLUS_CANCEL_URL.includes("token_mem"), false);
  assert.equal(getCancelUrl({ id: "naverplus", cancelUrl: `${NAVER_PLUS_CANCEL_URL}&token_mem=private` }),
    NAVER_PLUS_CANCEL_URL);
  assert.equal(getCancelUrl({ id: "spotify", cancelUrl: "https://www.spotify.com/account/" }),
    "https://www.spotify.com/account/");
  assert.equal(getCancelUrl({ id: "naverplus", cancelUrl: "https://play.google.com/store/account/subscriptions" }),
    "https://play.google.com/store/account/subscriptions");
  assert.equal(usesNaverPlusCancelEntry(stale), true);
  assert.equal(usesNaverPlusCancelEntry({ id: "naverplus", cancelUrl: "https://play.google.com/store/account/subscriptions" }), false);
});
