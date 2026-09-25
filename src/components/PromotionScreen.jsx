import { useMemo, useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { MacroPerkBlock, HanddrawnHatchedDivider } from "./MacroPerkBlock";
import { serviceCatalog } from "../data/subscriptionData";
import { evaluateBenefitComparison, isPromotionExpired } from "../lib/benefitComparison";

const won = (amount) => `${amount.toLocaleString("ko-KR")}원`;

function getSubscriptionServiceId(subscription) {
  const id = subscription.serviceId || subscription.service_id || subscription.id;
  if (serviceCatalog.some((service) => service.id === id)) return id;
  const name = String(subscription.name || "").toLowerCase().replace(/\s+/g, "");
  return serviceCatalog.find((service) => service.name.toLowerCase().replace(/\s+/g, "") === name ||
    (service.aliases || []).some((alias) => alias.toLowerCase().replace(/\s+/g, "") === name))?.id;
}

function BenefitComparison({ promotion, subscription }) {
  const [checks, setChecks] = useState({});
  const details = promotion.comparison;
  const comparisonSubscription = subscription ? { ...subscription, serviceId: getSubscriptionServiceId(subscription) } : null;
  const result = evaluateBenefitComparison({ offer: promotion, subscription: comparisonSubscription, userChecks: checks });
  const canCompare = result.status === "comparable";
  const amount = Number(subscription?.amount);

  return (
    <div className="min-w-0 rounded-2xl border border-[#E2E8EE] bg-white px-4 py-4 text-[12px] leading-5 text-[#333D4B]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-[14px] text-[#191F28]">지금 내는 요금과 비교</strong>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${canCompare ? "bg-[#E5F5EA] text-[#256B42]" : "bg-[#FFF2E9] text-[#865027]"}`}>
          {canCompare ? "조건부 예상 비교" : "조건 확인 필요"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-[minmax(0,105px)_minmax(0,1fr)] gap-x-2 gap-y-2">
        <dt className="text-[#637080]">현재 결제액</dt>
        <dd className="min-w-0 font-semibold break-words">{subscription && Number.isFinite(amount) && amount > 0
          ? `${subscription.plan ? `${subscription.plan} · ` : ""}${won(amount)} / ${subscription.billingCycle || "주기 확인 필요"}`
          : "등록된 결제액 확인 필요"}</dd>
        <dt className="text-[#637080]">혜택 적용 중</dt>
        <dd className="min-w-0 break-words">{canCompare
          ? `${result.periodCycles}회 결제 기준 · 대안 총 ${won(result.alternativeTotal)}`
          : "가격·적용 기간 확인 필요"}</dd>
        <dt className="text-[#637080]">필수 멤버십</dt>
        <dd className="min-w-0 break-words">{canCompare
          ? result.membership
            ? `${result.membership.name} ${won(result.membership.monthlyAmount)} / 월 · ${result.membershipStatus === "already-paid" ? "이미 결제 중, 새로 드는 비용 0원" : `새로 가입, 비교에 ${won(result.addedMembershipMonthly)} / 월 포함`}`
            : "없음 (공식 조건 확인)"
          : details?.requiredMembership?.name
            ? `${details.requiredMembership.name} · 추가 비용 및 기존 이용 여부 확인 필요`
            : "필요 여부와 추가 비용 확인 필요"}</dd>
        <dt className="text-[#637080]">추가 비용</dt>
        <dd className="min-w-0 break-words">{canCompare ? won(result.oneTimeCost) : "확인 필요"}</dd>
        <dt className="text-[#637080]">종료 후 요금</dt>
        <dd className="min-w-0 break-words">{canCompare && result.afterMonthly !== null
          ? `${won(result.afterMonthly)} / 월 (멤버십 추가 비용 별도)`
          : result.ongoing ? "종료일 미정 · 다음 결제 후 요금은 재확인" : "확인 필요"}</dd>
        <dt className="text-[#637080]">상품 조건 차이</dt>
        <dd className="min-w-0 break-words">{canCompare
          ? result.planChanges.length ? result.planChanges.join(" · ") : "동일 상품 조건 (공식 안내 기준)"
          : details?.planChanges?.length ? details.planChanges.join(" · ") : "광고·화질·이용 조건 확인 필요"}</dd>
        <dt className="text-[#637080]">신청 자격</dt>
        <dd className="min-w-0 break-words">{details?.eligibilityRules?.length
          ? details.eligibilityRules.join(" · ") : "공식 안내에서 확인 필요"}</dd>
      </dl>
      {details && (
        <fieldset className="mt-3 space-y-2 border-t border-[#E7EBEF] pt-3">
          <legend className="sr-only">혜택 비교를 위한 계정 정보 확인</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={checks.currentPlanConfirmed === true} onChange={(e) => setChecks((old) => ({ ...old, currentPlanConfirmed: e.target.checked }))} />
            현재 요금제와 결제액을 직접 확인했어요
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={checks.eligibilityConfirmed === true} onChange={(e) => setChecks((old) => ({ ...old, eligibilityConfirmed: e.target.checked }))} />
            공식 페이지에서 내 계정의 신청 자격을 확인했어요
          </label>
          {details.requiredMembership && (
            <label className="block">멤버십 이용 여부
              <select className="mt-1 min-h-11 w-full rounded-lg border border-[#C8D3DD] bg-white px-2" value={checks.membershipStatus || ""} onChange={(e) => setChecks((old) => ({ ...old, membershipStatus: e.target.value }))}>
                <option value="">선택해 주세요</option><option value="already-paid">이미 결제 중</option><option value="new">새로 가입</option>
              </select>
            </label>
          )}
          {details.exclusiveGroupId && (
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={checks.exclusiveChoiceConfirmed === true} onChange={(e) => setChecks((old) => ({ ...old, exclusiveChoiceConfirmed: e.target.checked }))} />
              함께 쓸 수 없는 혜택을 선택해 확인했어요
            </label>
          )}
        </fieldset>
      )}
      {canCompare ? (
        <div className="mt-3 rounded-xl bg-[#F1F6F3] p-3">
          <p className="font-bold">{result.periodCycles}회 결제 예상 지출 차이 · {result.difference > 0
            ? `${won(result.difference)} 적게 낼 가능성` : result.difference < 0
              ? `${won(-result.difference)} 더 낼 가능성` : "차이 없음"}</p>
          <p className="mt-1">현재 {won(result.currentTotal)} → 대안 {won(result.alternativeTotal)} (멤버십 신규 가입비·추가 비용 포함)</p>
          {result.currentPriceAssumption && <p className="mt-1">*현재 요금은 비교 기간 동안 지금 확인한 금액이 유지된다고 가정했어요.</p>}
          <p className="mt-1">*예상 지출 차이 : 직접 확인한 조건을 바탕으로 한 비용 비교입니다. 신청이 완료됐거나 실제 절약이 확정됐다는 뜻은 아닙니다.</p>
          {result.annual && (
            <details className="mt-2 border-t border-[#D3E0D8] pt-2">
              <summary className="cursor-pointer font-semibold">12개월 가정 비교 보기</summary>
              <p className="mt-1">현재 요금제를 유지하고, 확인된 각 회차 가격·전환 조건과 멤버십 상태가 12개월 동안 그대로 적용되며, 추가 비용은 첫 회에만 드는 경우: 현재 {won(result.annual.currentTotal)} · 대안 {won(result.annual.alternativeTotal)} · {result.annual.difference >= 0 ? "차이" : "비용 증가"} {won(Math.abs(result.annual.difference))}</p>
            </details>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-[#FFF8F1] p-3 text-[#704A2A]">
          <p className="font-bold">개인 예상 금액을 아직 계산할 수 없어요.</p>
          <ul className="mt-1 list-disc pl-4">{result.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {result.reasons.length > 2 && <details className="mt-1"><summary className="cursor-pointer">확인할 항목 {result.reasons.length - 2}개 더 보기</summary><ul className="list-disc pl-4">{result.reasons.slice(2).map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}
        </div>
      )}
      {/^https:\/\//.test(details?.sourceUrl || "") && <a className="mt-3 inline-flex min-h-11 items-center font-bold text-[#245B84] underline" href={details.sourceUrl} target="_blank" rel="noopener noreferrer">가격과 조건의 출처 열기</a>}
      <p className="mt-2 text-[11px] text-[#637080]">공식 안내에 혜택이 있어도 내 계정에 적용된 것은 아닙니다. 적용 전 공식 출처에서 조건을 확인해 주세요.</p>
    </div>
  );
}

function getPromoCategories(promotion) {
  const cats = new Set();
  if (promotion.category) cats.add(promotion.category);
  (promotion.sourceServiceIds || []).forEach((sId) => {
    const matchedService = serviceCatalog.find((s) => s.id === sId);
    if (matchedService?.category) cats.add(matchedService.category);
  });
  return cats;
}

function resolveFilter(promotion, filter, userSubscribedServiceIds) {
  if (filter === "all") return true;
  if (filter === "direct") return Boolean(promotion.isDirectMatch);
  if (filter === "100원/무료") return !promotion.membershipRequired && (promotion.category === "100원/무료" || promotion.offerPrice === 0 || promotion.offerPrice === 100);
  if (filter === "통신사/결합") return promotion.category === "통신사/결합" || promotion.id.includes("bundle") || promotion.id.includes("nerget") || promotion.id.includes("naver");
  if (filter === "학생/연간") return promotion.category === "학생/연간" || promotion.kind?.includes("연간") || promotion.kind?.includes("학생");
  
  const promoCats = getPromoCategories(promotion);
  return promoCats.has(filter);
}

function getServiceDisplayInfo(promotion) {
  const primaryServiceId = promotion.sourceServiceIds?.[0] || promotion.id.split("-")[0];
  const primaryService = serviceCatalog.find((s) => s.id === primaryServiceId);

  const isPartnership =
    (promotion.sourceServiceIds || []).length > 1 ||
    (promotion.title || "").includes("X") ||
    (promotion.kind || "").includes("제휴") ||
    (promotion.kind || "").includes("결합");

  let serviceName = promotion.title;
  if (!isPartnership && primaryService?.name) {
    serviceName = primaryService.name;
  }

  // The catalog does not encode a reliable price period or a verification date.
  // Keep the list useful for discovery without repeating unverified price claims.
  const solutionTitle = promotion.membershipRequired
    ? "멤버십 연계 혜택 후보"
    : promotion.category === "학생/연간"
      ? "학생·연간 혜택 후보"
      : promotion.category === "100원/무료"
        ? "체험·할인 혜택 후보"
        : "구독 혜택 후보";

  return {
    serviceId: primaryServiceId,
    serviceName,
    solutionTitle,
    isPartnership,
  };
}

function getBadgeInfo(promotion, isUserSubscribed) {
  if (!promotion.link) return { text: "안내 링크 확인 필요", isHighlight: false };
  return isUserSubscribed
    ? { text: "내 구독 관련 후보", isHighlight: true }
    : { text: "적용 조건 확인 필요", isHighlight: false };
}

export function PromotionScreen({ subscriptions = [], promotions = [], onOpenPromotion, contestMode = false }) {
  const [filter, setFilter] = useState("all");

  const userSubscribedServiceIds = useMemo(() => {
    const ids = new Set();
    subscriptions.forEach((sub) => {
      const sId = getSubscriptionServiceId(sub);
      if (sId) ids.add(sId);
      const nameKey = String(sub.name || "").toLowerCase().replace(/\s+/g, "");
      const matched = serviceCatalog.find(
        (s) =>
          s.id === sId ||
          s.name.toLowerCase().replace(/\s+/g, "") === nameKey ||
          (s.aliases || []).some((a) => a.toLowerCase().replace(/\s+/g, "") === nameKey)
      );
      if (matched) {
        ids.add(matched.id);
      }
    });
    return ids;
  }, [subscriptions]);

  const userSubscribedCategories = useMemo(() => {
    const cats = new Set();
    subscriptions.forEach((sub) => {
      const sId = getSubscriptionServiceId(sub);
      const nameKey = String(sub.name || "").toLowerCase().replace(/\s+/g, "");
      const matched = serviceCatalog.find(
        (s) =>
          s.id === sId ||
          s.name.toLowerCase().replace(/\s+/g, "") === nameKey ||
          (s.aliases || []).some((a) => a.toLowerCase().replace(/\s+/g, "") === nameKey)
      );
      const cat = matched?.category || sub.category;
      if (cat && cat !== "기타") cats.add(cat);
    });
    return cats;
  }, [subscriptions]);

  const isPersonalized = subscriptions.length > 0;

  const candidatePromotions = useMemo(() => {
    // Application deadlines only decide whether an item can still be offered.
    // Legacy catalog prices and its `saving` estimate never enter comparison.
    const activePromotions = promotions.filter((promo) => !isPromotionExpired(promo));
    if (!isPersonalized) {
      return activePromotions.map((p) => ({ ...p, isDirectMatch: false, isCategoryMatch: false }));
    }

    const matched = [];
    const seenIds = new Set();

    for (const promo of activePromotions) {
      const promoCats = getPromoCategories(promo);
      const isDirectMatch = (promo.sourceServiceIds || []).some((id) =>
        userSubscribedServiceIds.has(id)
      );
      const isCategoryMatch = Array.from(promoCats).some((c) =>
        userSubscribedCategories.has(c)
      );

      if (isDirectMatch || isCategoryMatch) {
        if (!seenIds.has(promo.id)) {
          seenIds.add(promo.id);
          matched.push({
            ...promo,
            isDirectMatch,
            isCategoryMatch,
          });
        }
      }
    }

    matched.sort((a, b) => {
      if (a.isDirectMatch && !b.isDirectMatch) return -1;
      if (!a.isDirectMatch && b.isDirectMatch) return 1;
      return 0;
    });

    return matched;
  }, [isPersonalized, promotions, userSubscribedServiceIds, userSubscribedCategories]);

  const dynamicFilters = useMemo(() => {
    if (!isPersonalized) {
      return [
        { id: "all", label: "전체" },
        { id: "100원/무료", label: "체험·할인" },
        { id: "OTT", label: "OTT" },
        { id: "음악", label: "음악" },
        { id: "통신사/결합", label: "통신사 결합" },
        { id: "학생/연간", label: "학생 · 연간" },
      ];
    }

    const items = [{ id: "all", label: "맞춤 전체" }];

    const hasDirect = candidatePromotions.some((p) => p.isDirectMatch);
    if (hasDirect) {
      items.push({ id: "direct", label: "내 구독 혜택" });
    }

    userSubscribedCategories.forEach((cat) => {
      items.push({ id: cat, label: cat });
    });

    const hasFree = candidatePromotions.some(
      (p) => !p.membershipRequired && (p.offerPrice === 0 || p.offerPrice === 100 || p.category === "100원/무료")
    );
    if (hasFree) {
      items.push({ id: "100원/무료", label: "체험·할인" });
    }

    return items;
  }, [isPersonalized, userSubscribedCategories, candidatePromotions]);

  useEffect(() => {
    const isValid = dynamicFilters.some((f) => f.id === filter);
    if (!isValid) {
      setFilter("all");
    }
  }, [dynamicFilters, filter]);

  const filtered = useMemo(() => {
    return candidatePromotions.filter((promo) =>
      resolveFilter(promo, filter, userSubscribedServiceIds)
    );
  }, [candidatePromotions, filter, userSubscribedServiceIds]);

  const categorySummary = useMemo(() => {
    if (!isPersonalized) return "";
    return Array.from(userSubscribedCategories).join(" · ");
  }, [isPersonalized, userSubscribedCategories]);

  const contestDirectPromotion = useMemo(
    () =>
      candidatePromotions.find(
        (promotion) => promotion.id === "naverplus-netflix" && promotion.isDirectMatch
      ) ||
      null,
    [candidatePromotions]
  );

  const contestSourceHost = useMemo(() => {
    try {
      return contestDirectPromotion?.link ? new URL(contestDirectPromotion.link).hostname : "";
    } catch {
      return "";
    }
  }, [contestDirectPromotion]);

  const contestMatchedSubscription = useMemo(() => {
    if (!contestDirectPromotion) return null;
    return subscriptions.find((subscription) => {
      const id = getSubscriptionServiceId(subscription);
      return id === (contestDirectPromotion.comparison?.currentServiceId || contestDirectPromotion.sourceServiceIds?.[0]);
    }) || null;
  }, [contestDirectPromotion, subscriptions]);

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 select-none">
      {/* 1. 상단 타이틀 & 안내 헤더 */}
      <div className="pb-4">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#FF6F0F] tracking-tight">
          <Sparkles size={14} />
          <span>{isPersonalized ? "내 구독 관련 혜택 후보" : "혜택 후보 살펴보기"}</span>
        </div>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-[#191F28]">
          {contestMode && contestDirectPromotion ? "절약할 선택지 살펴보기" : "혜택 후보 살펴보기"}
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B7684] font-medium leading-relaxed">
          {contestMode && contestDirectPromotion
            ? "등록한 구독과 연결된 혜택을 살펴보고, 내게 적용되는 조건과 공식 출처를 확인해 보세요."
            : isPersonalized
            ? `등록한 ${categorySummary || "구독"} 관련 혜택 후보를 모았어요. 적용 대상·기간·요금은 안내 링크에서 확인해 주세요.`
            : "구독을 추가하면 관련 혜택 후보를 살펴볼 수 있어요. 적용 조건과 요금은 안내 링크에서 확인해 주세요."}
        </p>
        {categorySummary.includes("SaaS") && <p className="mt-1 text-[11px] text-[#697987]">*SaaS : 설치하지 않고 인터넷에서 이용하는 소프트웨어 서비스입니다.</p>}
      </div>

      {contestMode && contestDirectPromotion && (
        <section className="mb-5 overflow-hidden rounded-[22px] border border-[#D9E7F8] bg-[#F7FBFF]">
          <div className="border-b border-[#E4EDF7] px-4 py-4">
            <span className="text-[10px] font-black tracking-[0.14em] text-[#467BA0]">내 구독과 연결된 혜택</span>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-[#191F28]">
              등록한 {contestMatchedSubscription?.name || "구독"} 기준으로 확인할 수 있는 혜택이에요.
            </h2>
            <p className="mt-1.5 text-[12px] leading-5 text-[#6B7684]">
              지금 내는 구독료와 혜택에 필요한 비용·상품 변경 조건을 비교해 보세요. 꾸독은 적용 조건과 공식 출처를 보여주고, 유지하거나 바꿀지는 직접 결정하도록 돕습니다.
            </p>
          </div>

          <div className="px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E5F2F9] px-2.5 py-1 text-[10px] font-black text-[#315976]">
                {contestDirectPromotion.link ? "공식 안내 링크 제공" : "조건 확인 필요"}
              </span>
              {contestSourceHost && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#6B7684] ring-1 ring-[#E5E8EB]">
                  출처 {contestSourceHost}
                </span>
              )}
            </div>

            <h3 className="mt-3 text-[17px] font-black tracking-tight text-[#191F28]">
              {contestDirectPromotion.title}
            </h3>
            <p className="mt-1 text-[13px] font-bold text-[#467BA0]">
              {contestDirectPromotion.subtitle || contestDirectPromotion.kind}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#4E5968]">
              {contestDirectPromotion.description}
            </p>

            {Number(contestMatchedSubscription?.amount) > 0 && (
              <p className="mt-3 rounded-xl bg-[#E8F3F9] px-3.5 py-3 text-[12px] font-semibold leading-5 text-[#315976]">
                비교할 내 결제액 · {contestMatchedSubscription.name} {Number(contestMatchedSubscription.amount).toLocaleString("ko-KR")}원
                {contestMatchedSubscription.billingCycle ? ` / ${contestMatchedSubscription.billingCycle}` : ""}
              </p>
            )}

            <dl className="mt-4 overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white text-[11px]">
              <div className="grid grid-cols-[84px_1fr] gap-3 border-b border-[#F2F4F6] px-3.5 py-3">
                <dt className="font-semibold text-[#8B95A1]">적용 조건</dt>
                <dd className="m-0 font-semibold leading-5 text-[#333D4B]">{contestDirectPromotion.campaignPeriod || "공식 페이지에서 확인 필요"}</dd>
              </div>
              <div className="grid grid-cols-[84px_1fr] gap-3 border-b border-[#F2F4F6] px-3.5 py-3">
                <dt className="font-semibold text-[#8B95A1]">혜택 기간</dt>
                <dd className="m-0 font-semibold leading-5 text-[#333D4B]">{contestDirectPromotion.benefitPeriod || "공식 페이지에서 확인 필요"}</dd>
              </div>
              <div className="grid grid-cols-[84px_1fr] gap-3 px-3.5 py-3">
                <dt className="font-semibold text-[#8B95A1]">{contestDirectPromotion.membershipRequired ? "상품 별도 가격" : "혜택 가치"}</dt>
                <dd className="m-0 font-semibold leading-5 text-[#333D4B]">
                  {Number(contestDirectPromotion.originalPrice) > 0
                    ? `${Number(contestDirectPromotion.originalPrice).toLocaleString("ko-KR")}원 / 월`
                    : "조건 확인 필요"}
                </dd>
              </div>
              {contestDirectPromotion.membershipRequired && (
                <div className="grid grid-cols-[84px_1fr] gap-3 border-t border-[#F2F4F6] px-3.5 py-3">
                  <dt className="font-semibold text-[#8B95A1]">멤버십 이용료</dt>
                  <dd className="m-0 font-semibold leading-5 text-[#333D4B]">{Number(contestDirectPromotion.membershipMonthlyPrice) > 0 ? `${Number(contestDirectPromotion.membershipMonthlyPrice).toLocaleString("ko-KR")}원 / 월` : "공식 안내에서 확인 필요"}</dd>
                </div>
              )}
            </dl>

            <p className="mt-3 text-[10px] leading-4 text-[#8B95A1]">
              *혜택 가치 : 안내된 상품의 별도 가격을 기준으로 한 값이며 내 확정 절약액은 아닙니다. *상품 별도 가격 : 멤버십 없이 해당 상품을 구독할 때의 가격입니다.
              실제 절약액은 현재 요금제·기존 멤버십 여부·선택 상품에 따라 달라집니다.
            </p>
            <p className="mt-2 text-[10px] leading-4 text-[#767B80]">
              *크롤링 : 공개된 페이지의 정보를 자동으로 모으는 과정입니다. 현재 혜택 정보 수집의 정확도를 개선 중이므로, 적용 전 공식 출처의 최신 조건을 확인해 주세요.
            </p>

            <div className="mt-3"><BenefitComparison promotion={contestDirectPromotion} subscription={contestMatchedSubscription} /></div>

            <button
              type="button"
              data-contest-target="contest-benefit-source"
              onClick={() => onOpenPromotion(contestDirectPromotion)}
              className="mt-4 min-h-[48px] w-full rounded-2xl bg-[#191F28] px-4 text-[13px] font-bold text-white active:scale-[0.99]"
            >
              공식 출처에서 조건 확인하기
            </button>
            {contestDirectPromotion.priceSourceUrl && (
              <a className="mt-3 block text-center text-[12px] font-semibold text-[#3182F6] underline" href={contestDirectPromotion.priceSourceUrl} target="_blank" rel="noreferrer">
                넷플릭스 별도 요금 확인하기
              </a>
            )}
          </div>
        </section>
      )}

      <p className="mb-4 rounded-xl bg-[#F2F6F8] px-3.5 py-3 text-[12px] leading-5 text-[#4E5968]">
        아래 목록은 내 구독과 관련될 수 있는 혜택 후보입니다. 혜택 수집 정보의 정확도를 개선 중이에요. 공식 안내의 최신 가격·기간·적용 대상을 확인한 뒤 현재 결제액과 비교해 주세요.
      </p>

      {/* 2. 심플 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {dynamicFilters.map((item) => {
          const isSelected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#191F28] text-white shadow-xs"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3. 손글씨 빗금 구분선 기반 대형 혜택 블록 리스트 */}
      <section className="mt-2 flex flex-col">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#8B95A1]">
            <p className="text-[15px] font-bold">해당 카테고리의 맞춤 혜택이 없어요.</p>
            <p className="mt-1 text-[13px]">다른 필터를 선택하거나 전체 혜택을 둘러보세요.</p>
          </div>
        ) : (
          filtered.map((promotion, index) => {
            const displayInfo = getServiceDisplayInfo(promotion);
            const badgeInfo = getBadgeInfo(promotion, promotion.isDirectMatch);
            const subscription = subscriptions.find((item) => getSubscriptionServiceId(item) ===
              (promotion.comparison?.currentServiceId || promotion.sourceServiceIds?.[0]));

            return (
              <div key={promotion.id} className="w-full">
                <MacroPerkBlock
                  serviceId={displayInfo.serviceId}
                  serviceName={displayInfo.serviceName}
                  solutionTitle={displayInfo.solutionTitle}
                  description="현재 가격·이용 기간·적용 대상은 안내 링크에서 확인해 주세요."
                  savingText={promotion.link ? "조건 확인하기" : "조건 확인 필요"}
                  isDirectMatch={badgeInfo.isHighlight}
                  badgeText={badgeInfo.text}
                  onAction={promotion.link ? () => onOpenPromotion(promotion) : undefined}
                />
                <BenefitComparison promotion={promotion} subscription={subscription} />
                {/* 마지막 아이템 뒤에는 구분선을 두지 않음 */}
                {index < filtered.length - 1 && <HanddrawnHatchedDivider />}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
