import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBenefitComparison, isPromotionExpired } from "../src/lib/benefitComparison.js";

const now = Date.parse("2026-09-25T03:00:00Z");
const subscription = { serviceId: "netflix", plan: "스탠다드", amount: 12000, billingCycle: "매월" };
const checks = { currentPlanConfirmed: true, eligibilityConfirmed: true, membershipStatus: "already-paid", exclusiveChoiceConfirmed: true };
const base = {
  id: "netflix-benefit",
  comparison: {
    currentServiceId: "netflix",
    sourceVerification: "official",
    sourceUrl: "https://example.org/official",
    verifiedAt: "2026-09-24T03:00:00Z",
    applicationEndsAt: "2026-10-30",
    currency: "KRW",
    effectiveTiming: "next-billing-cycle",
    targetPlanName: "스탠다드",
    planChanges: [],
    eligibilityRules: ["본인 계정에서 신청 가능"],
    requiredMembership: null,
    oneTimeCost: 0,
    exclusiveGroupId: "streaming-choice",
    benefitCycles: 3,
    annualConditionsConfirmed: true,
    currentPricePhases: [{ fromCycle: 1, toCycle: 12, monthlyAmount: 12000 }],
    pricePhases: [
      { fromCycle: 1, toCycle: 3, monthlyAmount: 8000 },
      { fromCycle: 4, toCycle: 12, monthlyAmount: 12000 },
    ],
  },
};
const compare = (offer = base, sub = subscription, userChecks = checks) =>
  evaluateBenefitComparison({ offer, subscription: sub, userChecks, now });
const withDetails = (changes) => ({ ...base, comparison: { ...base.comparison, ...changes } });

test("혜택 기간을 기본 비교하고 온전한 12개월 가격을 알 때만 보조 비교한다", () => {
  const result = compare();
  assert.equal(result.status, "comparable");
  assert.deepEqual([result.periodCycles, result.currentTotal, result.alternativeTotal, result.difference, result.afterMonthly], [3, 36000, 24000, 12000, 12000]);
  assert.deepEqual(result.annual, { currentTotal: 144000, alternativeTotal: 132000, difference: 12000 });
  assert.equal(result.isConditional, true);
});

test("기간 할인 종료 후 요금 누락, 나머지 연간 가격 누락은 각각 금액 숨김과 연간 비교 숨김", () => {
  const missingEnd = compare(withDetails({ pricePhases: [{ fromCycle: 1, toCycle: 3, monthlyAmount: 8000 }] }));
  assert.equal(missingEnd.status, "candidate");
  assert.equal("difference" in missingEnd, false);
  assert.match(missingEnd.reasons.join(" "), /종료 후/);

  const noAnnual = compare(withDetails({ pricePhases: [
    { fromCycle: 1, toCycle: 3, monthlyAmount: 8000 },
    { fromCycle: 4, toCycle: 4, monthlyAmount: 12000 },
  ] }));
  assert.equal(noAnnual.status, "comparable");
  assert.equal(noAnnual.annual, null);
  assert.equal(compare(withDetails({ currentPricePhases: undefined })).annual, null);
  assert.equal(compare(withDetails({ annualConditionsConfirmed: false })).annual, null);
});

test("멤버십 기존 보유와 신규 가입의 실제 추가 비용을 각각 반영한다", () => {
  const offer = withDetails({ requiredMembership: { name: "제휴 멤버십", monthlyAmount: 4900 } });
  assert.equal(compare(offer).difference, 12000);
  const newMember = compare(offer, subscription, { ...checks, membershipStatus: "new" });
  assert.equal(newMember.alternativeTotal, 38700);
  assert.equal(newMember.difference, -2700);
  assert.equal(compare(offer, subscription, { ...checks, membershipStatus: undefined }).status, "candidate");
  assert.equal(compare(withDetails({ requiredMembership: undefined })).status, "candidate");
  assert.equal(compare(withDetails({ oneTimeCost: undefined })).status, "candidate");
});

test("상품 변경 내용과 결제 시점을 모르면 계산하지 않고, 알면 차이를 같이 돌려준다", () => {
  assert.equal(compare(withDetails({ targetPlanName: "광고형" })).status, "candidate");
  const changed = compare(withDetails({ targetPlanName: "광고형", planChanges: ["광고 포함", "화질 변경 가능"] }));
  assert.deepEqual(changed.planChanges, ["광고 포함", "화질 변경 가능"]);
  assert.equal(compare(withDetails({ effectiveTiming: undefined })).status, "candidate");
});

test("만료일은 한국 날짜 종료 시점까지 활성, 지난 혜택은 만료 판정", () => {
  const offer = { campaignPeriod: "2026.08.01 ~ 2026.09.25" };
  assert.equal(isPromotionExpired(offer, Date.parse("2026-09-25T14:59:00Z")), false);
  assert.equal(isPromotionExpired(offer, Date.parse("2026-09-25T15:00:00Z")), true);
  assert.equal(compare(withDetails({ applicationEndsAt: "2026-09-24" })).status, "expired");
});

test("비용 증가도 비교 결과에 남겨 UI가 절약으로 오인하지 않게 한다", () => {
  const result = compare(withDetails({ pricePhases: [{ fromCycle: 1, toCycle: 12, monthlyAmount: 14000 }] }));
  assert.equal(result.difference, -6000);
});

test("중복 불가 혜택은 사용자가 선택을 확인하기 전 금액을 숨긴다", () => {
  const result = compare(base, subscription, { ...checks, exclusiveChoiceConfirmed: false });
  assert.equal(result.status, "candidate");
  assert.equal("alternativeTotal" in result, false);
});

test("연간 선결제, 불명확한 결제 주기, 출처 최신성, 대상 불일치면 금액을 숨긴다", () => {
  for (const sub of [
    { ...subscription, billingCycle: "매년", amount: 144000 },
    { ...subscription, billingCycle: undefined },
    { ...subscription, serviceId: "spotify" },
    { ...subscription, sharingEnabled: true, grossAmount: 24000 },
    { ...subscription, plan: "기본 플랜" },
  ]) assert.equal(compare(base, sub).status, "candidate");
  assert.equal(compare(withDetails({ verifiedAt: "2026-09-01T03:00:00Z" })).status, "candidate");
  assert.equal(compare(withDetails({ sourceVerification: "catalog" })).status, "candidate");
});

test("지속형 혜택은 다음 1회만 비교하며 12개월을 추측하지 않는다", () => {
  const result = compare(withDetails({ benefitCycles: null, pricePhases: [{ fromCycle: 1, toCycle: 1, monthlyAmount: 8000 }] }));
  assert.equal(result.status, "comparable");
  assert.equal(result.periodCycles, 1);
  assert.equal(result.ongoing, true);
  assert.equal(result.annual, null);
  assert.equal(result.afterMonthly, null);
});

test("현재 요금제의 가격이 바뀌는 기간도 월별로 비교하고 등록액과 불일치하면 숨긴다", () => {
  const withChange = compare(withDetails({ currentPricePhases: [
    { fromCycle: 1, toCycle: 1, monthlyAmount: 12000 },
    { fromCycle: 2, toCycle: 12, monthlyAmount: 13000 },
  ] }));
  assert.equal(withChange.currentTotal, 38000);
  assert.equal(withChange.difference, 14000);
  assert.equal(compare(withDetails({ currentPricePhases: [{ fromCycle: 1, toCycle: 12, monthlyAmount: 11000 }] })).status, "candidate");
});

test("기존 saving 및 해지 저장액은 어떠한 비교 금액에도 영향을 주지 않는다", () => {
  const result = compare({ ...base, saving: 99999999 }, { ...subscription, savedAmount: 99999999 });
  assert.equal(result.difference, 12000);
});
