import test from "node:test";
import assert from "node:assert/strict";
import { createMockSubscriptions } from "../src/data/subscriptionData.js";
import {
  CONTEST_CANCELLATION_SUBSCRIPTION_ID,
  createContestSubscriptions,
} from "../src/contest/contestSubscriptions.js";

test("NaverPlus cancellation example exists only in contest scenario B", () => {
  const ordinary = createMockSubscriptions();
  const scenarioA = createContestSubscriptions("A");
  const scenarioB = createContestSubscriptions("B");

  assert.equal(ordinary.some(({ id }) => id === "naverplus"), false);
  assert.equal(scenarioA.some(({ id }) => id === "naverplus"), false);
  assert.equal(scenarioB.some(({ id }) => id === "netflix"), false);

  const naverPlus = scenarioB.find(({ subscriptionId }) => subscriptionId === CONTEST_CANCELLATION_SUBSCRIPTION_ID);
  assert.equal(naverPlus?.id, "naverplus");
  assert.equal(naverPlus?.cancelUrl, "https://nid.naver.com/membership/my");
  assert.equal(scenarioB.find(({ id }) => id === "spotify")?.subscriptionId, "seed-spotify");
});
