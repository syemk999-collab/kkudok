import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promotionCatalog } from "../src/data/subscriptionData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("혜택 데이터셋 정제 및 서비스 매핑 무결성 검증", () => {
  const promotionsPath = path.join(__dirname, "../public/catalog/promotions.json");
  const servicesPath = path.join(__dirname, "../public/catalog/services.json");

  assert.ok(fs.existsSync(promotionsPath), "promotions.json 파일이 존재해야 합니다.");
  assert.ok(fs.existsSync(servicesPath), "services.json 파일이 존재해야 합니다.");

  const promotions = JSON.parse(fs.readFileSync(promotionsPath, "utf8"));
  const services = JSON.parse(fs.readFileSync(servicesPath, "utf8"));

  const serviceIdSet = new Set(services.map((s) => s.id));
  const promoIdSet = new Set(promotions.map((b) => b.id));

  // 1. 모든 혜택 ID가 고유해야 함
  assert.equal(promoIdSet.size, promotions.length, "모든 프로모션 ID는 고유해야 합니다.");

  // 2. 모든 프로모션의 sourceServiceIds는 유효한 94개 서비스 목록에 속해야 함
  for (const promo of promotions) {
    for (const sId of promo.sourceServiceIds || []) {
      assert.ok(
        serviceIdSet.has(sId),
        `연결된 서비스 ID '${sId}'는 유효한 서비스 목록에 존재해야 합니다.`
      );
    }
  }

  // 3. 다중 서비스 제휴 혜택 검증 (예: 넷플릭스-네이버플러스)
  const netflixNaverPromo = promotions.find((p) => p.id === "naverplus-netflix");
  assert.ok(netflixNaverPromo, "naverplus-netflix 프로모션이 존재해야 합니다.");
  assert.ok(netflixNaverPromo.sourceServiceIds.includes("netflix"));
  assert.ok(netflixNaverPromo.sourceServiceIds.includes("naverplus"));
});

test("사용자 등록 구독 기반 혜택 조회 시 제휴 혜택 중복 제거 알고리즘 검증", () => {
  const promotionsPath = path.join(__dirname, "../public/catalog/promotions.json");
  const promotions = JSON.parse(fs.readFileSync(promotionsPath, "utf8"));

  const userSubscribedServiceIds = ["netflix", "naverplus"];

  // 표기 시점 Deduplication 적용
  const deduplicatedMap = new Map();

  for (const promo of promotions) {
    const isRelevant = promo.sourceServiceIds.some((sId) => userSubscribedServiceIds.includes(sId));
    if (isRelevant) {
      if (!deduplicatedMap.has(promo.id)) {
        deduplicatedMap.set(promo.id, promo);
      }
    }
  }

  const finalPersonalizedBenefits = Array.from(deduplicatedMap.values());
  const naverplusNetflixFinal = finalPersonalizedBenefits.filter(
    (b) => b.id === "naverplus-netflix"
  );
  assert.equal(naverplusNetflixFinal.length, 1, "중복 제거 후 최종 혜택 목록에는 1번만 노출되어야 합니다.");
});

test("Netflix 제휴 혜택의 화면 데이터와 공개 카탈로그 가격·가입 조건이 일치한다", () => {
  const publicPromotions = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../public/catalog/promotions.json"), "utf8")
  );
  const source = publicPromotions.find((item) => item.id === "naverplus-netflix");
  const displayed = promotionCatalog.find((item) => item.id === "naverplus-netflix");
  assert.ok(source && displayed);

  for (const field of ["description", "originalPrice", "membershipMonthlyPrice", "membershipRequired", "priceSourceUrl", "campaignPeriod", "benefitPeriod"]) {
    assert.deepEqual(displayed[field], source[field], `${field} 값이 두 카탈로그에서 같아야 합니다.`);
  }
  assert.equal(source.membershipRequired, true);
  assert.ok(source.originalPrice > source.membershipMonthlyPrice);
  assert.match(source.description, /회차.*4종.*광고형 스탠다드/);
  assert.doesNotMatch(source.subtitle, /넷플릭스 0원/);
});
