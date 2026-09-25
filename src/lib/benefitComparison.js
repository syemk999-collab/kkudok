// The catalog is a discovery source. The future pipeline may provide `comparison`:
// currentServiceId, official sourceUrl/sourceVerification/verifiedAt, applicationEndsAt,
// KRW currency, next-billing-cycle effectiveTiming, targetPlanName, planChanges,
// eligibilityRules, requiredMembership (explicit null or { name, monthlyAmount }),
// oneTimeCost (including 0), exclusiveGroupId, benefitCycles (1–12 or null for
// next-cycle-only recurring), and non-overlapping monthly pricePhases.
// Optional currentPricePhases and annualConditionsConfirmed allow 12-month projections.
// Never derive any of these from old `saving`, free-text benefits or cancellation data.
const MAX_SOURCE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function dateOnlyInSeoul(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(now));
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function normalizedDate(value) {
  const match = String(value || "").match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function isPromotionExpired(offer, now = Date.now()) {
  const deadline = offer?.comparison?.applicationEndsAt || offer?.applicationEndsAt ||
    // Older catalog descriptions are used only to hide a known expired offer,
    // never to calculate a price, duration or personal eligibility.
    String(offer?.campaignPeriod || "").match(/~\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/)?.[1];
  const date = normalizedDate(deadline);
  if (date) return date < dateOnlyInSeoul(now);
  if (!deadline) return false;
  const timestamp = Date.parse(deadline);
  return Number.isFinite(timestamp) && timestamp < now;
}

function isWon(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function getMonthlyPrices(phases, count) {
  if (!Array.isArray(phases) || !Number.isInteger(count) || count < 1 || count > 12) return null;
  const amounts = [];
  for (let cycle = 1; cycle <= count; cycle += 1) {
    const matches = phases.filter((phase) =>
      Number.isInteger(phase.fromCycle) && Number.isInteger(phase.toCycle) &&
      phase.fromCycle <= cycle && phase.toCycle >= cycle && isWon(phase.monthlyAmount)
    );
    if (matches.length !== 1) return null;
    amounts.push(matches[0].monthlyAmount);
  }
  return amounts;
}

export function evaluateBenefitComparison({ offer, subscription, userChecks = {}, now = Date.now() }) {
  if (isPromotionExpired(offer, now)) return { status: "expired", reasons: ["신청 기간이 종료됐어요."] };

  const details = offer?.comparison;
  const reasons = [];
  if (!subscription) reasons.push("비교할 현재 구독을 확인해 주세요.");
  if (!details) return { status: "candidate", reasons: [...reasons, "혜택 가격과 이용 기간을 공식 안내에서 확인해 주세요."] };

  const currentAmount = Number(subscription?.amount);
  if (!details.currentServiceId || details.currentServiceId !== (subscription?.serviceId || subscription?.service_id)) {
    reasons.push("혜택 대상과 지금 구독하는 서비스가 같은지 확인해 주세요.");
  }
  if (!subscription?.plan || !isWon(currentAmount) || currentAmount === 0 || !["매월", "monthly"].includes(subscription?.billingCycle)) {
    reasons.push("현재 요금제·실제 결제액·월 결제 여부를 확인해 주세요.");
  } else if (userChecks.currentPlanConfirmed !== true) {
    reasons.push("현재 요금제와 결제액이 맞는지 확인해 주세요.");
  }
  if (subscription?.plan === "기본 플랜" || subscription?.sharingEnabled) {
    reasons.push("현재 실제 요금제와 공동 이용 시 개인 부담액의 비교 기준을 확인해 주세요.");
  }
  if (userChecks.eligibilityConfirmed !== true || !Array.isArray(details.eligibilityRules)) {
    reasons.push("내 계정에 혜택 조건이 맞는지 공식 페이지에서 확인해 주세요.");
  }
  const checkedAt = Date.parse(details.verifiedAt);
  if (details.sourceVerification !== "official" || !/^https:\/\//.test(details.sourceUrl || "") ||
      !Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > MAX_SOURCE_AGE_MS) {
    reasons.push("공식 출처의 현재 가격과 조건을 다시 확인해 주세요.");
  }
  if (details.currency !== "KRW" || details.effectiveTiming !== "next-billing-cycle") {
    reasons.push("결제 단위와 혜택이 적용될 시점을 확인해 주세요.");
  }
  if (!details.targetPlanName || !Array.isArray(details.planChanges) ||
      (subscription?.plan && details.targetPlanName !== subscription.plan && details.planChanges.length === 0)) {
    reasons.push("혜택을 쓰면 달라지는 상품 내용을 확인해 주세요.");
  }
  if (!Object.hasOwn(details, "requiredMembership") || details.requiredMembership === undefined || !isWon(details.oneTimeCost)) {
    reasons.push("필수 멤버십과 추가 비용을 확인해 주세요.");
  }
  let addedMembershipMonthly = 0;
  if (details.requiredMembership !== null && details.requiredMembership !== undefined) {
    if (!isWon(details.requiredMembership.monthlyAmount) || !details.requiredMembership.name ||
        !["already-paid", "new"].includes(userChecks.membershipStatus)) {
      reasons.push("기존 멤버십 이용 여부와 추가 비용을 확인해 주세요.");
    } else if (userChecks.membershipStatus === "new") {
      addedMembershipMonthly = details.requiredMembership.monthlyAmount;
    }
  }
  if (details.exclusiveGroupId && userChecks.exclusiveChoiceConfirmed !== true) {
    reasons.push("동시에 사용할 수 없는 다른 혜택이 있는지 확인해 주세요.");
  }

  const cycles = details.benefitCycles === null ? 1 : details.benefitCycles;
  const periodPrices = getMonthlyPrices(details.pricePhases, cycles);
  const currentPeriodPrices = details.currentPricePhases === undefined
    ? Array.isArray(periodPrices) ? Array(cycles).fill(currentAmount) : null
    : getMonthlyPrices(details.currentPricePhases, cycles);
  if (!periodPrices) reasons.push("혜택 기간의 월별 가격을 확인해 주세요.");
  if (!currentPeriodPrices || currentPeriodPrices[0] !== currentAmount) {
    reasons.push("현재 요금제의 기간별 요금과 등록된 결제액을 맞춰 주세요.");
  }
  if (details.benefitCycles !== null && Number.isInteger(cycles) && cycles > 0 && cycles < 12 &&
      !getMonthlyPrices(details.pricePhases, cycles + 1)) {
    reasons.push("혜택 종료 후 청구될 요금을 확인해 주세요.");
  }
  if (reasons.length) return { status: "candidate", reasons: [...new Set(reasons)] };

  const currentTotal = currentPeriodPrices.reduce((sum, amount) => sum + amount, 0);
  const alternativeTotal = periodPrices.reduce((sum, amount) => sum + amount, 0) +
    addedMembershipMonthly * cycles + details.oneTimeCost;
  const twelveMonthPrices = getMonthlyPrices(details.pricePhases, 12);
  const currentAnnualPrices = getMonthlyPrices(details.currentPricePhases, 12);
  const annual = Number.isInteger(details.benefitCycles) && details.annualConditionsConfirmed === true &&
    twelveMonthPrices && currentAnnualPrices?.[0] === currentAmount ? {
    currentTotal: currentAnnualPrices.reduce((sum, amount) => sum + amount, 0),
    alternativeTotal: twelveMonthPrices.reduce((sum, amount) => sum + amount, 0) +
      addedMembershipMonthly * 12 + details.oneTimeCost,
  } : null;
  if (annual) annual.difference = annual.currentTotal - annual.alternativeTotal;

  return {
    status: "comparable",
    periodCycles: cycles,
    currentTotal,
    alternativeTotal,
    difference: currentTotal - alternativeTotal,
    annual,
    afterMonthly: details.benefitCycles !== null && cycles < 12 ? getMonthlyPrices(details.pricePhases, cycles + 1)?.at(-1) ?? null : null,
    addedMembershipMonthly,
    membership: details.requiredMembership,
    membershipStatus: details.requiredMembership ? userChecks.membershipStatus : null,
    oneTimeCost: details.oneTimeCost,
    ongoing: details.benefitCycles === null,
    currentPriceAssumption: details.currentPricePhases === undefined,
    planChanges: details.planChanges,
    sourceUrl: details.sourceUrl,
    verifiedAt: details.verifiedAt,
    targetPlanName: details.targetPlanName,
    isConditional: true,
  };
}
