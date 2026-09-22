import test from "node:test";
import assert from "node:assert/strict";
import {
  createContestPaymentEvent,
  parsePaymentNotification,
  toQuickAddData,
} from "../src/lib/paymentParser.js";

test("공모전 결제 원문은 Netflix 구독으로 실제 파싱된다", () => {
  const parsed = parsePaymentNotification(createContestPaymentEvent());

  assert.ok(parsed);
  assert.equal(parsed.isSubscription, true);
  assert.equal(parsed.serviceId, "netflix");
  assert.equal(parsed.serviceName, "Netflix");
  assert.equal(parsed.amount, 17000);
  assert.equal(parsed.plan, "프리미엄");
  assert.equal(parsed.paymentMethod, "신한카드");

  const quickAdd = toQuickAddData(parsed, new Date("2026-09-22T09:00:00+09:00"));
  assert.equal(quickAdd.name, "Netflix");
  assert.equal(quickAdd.amount, 17000);
  assert.equal(quickAdd.dueDay, 22);
  assert.equal(quickAdd.sourceType, "notification");
  assert.equal(quickAdd.autoDetected, true);
});

test("취소/환불 원문은 결제로 등록하지 않는다", () => {
  const parsed = parsePaymentNotification({
    packageName: "com.shcard.smartpay",
    title: "[신한카드] 승인취소",
    body: "넷플릭스 17,000원 결제취소",
  });
  assert.equal(parsed, null);
});

test("일반 상점 결제는 구독 키워드나 알려진 서비스가 없으면 제외한다", () => {
  const parsed = parsePaymentNotification({
    packageName: "com.shcard.smartpay",
    title: "[신한카드] 결제승인",
    body: "동네카페 17,000원 정상승인",
  });
  assert.equal(parsed, null);
});

test("복합 플랫폼은 알려진 멤버십 금액 또는 정기 키워드가 필요하다", () => {
  assert.equal(
    parsePaymentNotification({
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 결제승인",
      body: "쿠팡 32,000원 정상승인",
    }),
    null
  );

  const wow = parsePaymentNotification({
    packageName: "com.shcard.smartpay",
    title: "[신한카드] 결제승인",
    body: "쿠팡 와우멤버십 7,890원 정상승인",
  });
  assert.equal(wow?.serviceId, "coupang");
  assert.equal(wow?.amount, 7890);
});
