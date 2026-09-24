import { useMemo, useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { MacroPerkBlock, HanddrawnHatchedDivider } from "./MacroPerkBlock";
import { serviceCatalog } from "../data/subscriptionData";

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

  let solutionTitle = promotion.subtitle;
  if (!solutionTitle || solutionTitle === promotion.title) {
    solutionTitle = promotion.kind || promotion.title;
  }

  return {
    serviceId: primaryServiceId,
    serviceName,
    solutionTitle,
    isPartnership,
  };
}

function getBadgeInfo(promotion, isUserSubscribed) {
  const isPartnership =
    (promotion.sourceServiceIds || []).length > 1 ||
    (promotion.title || "").includes("X") ||
    (promotion.kind || "").includes("제휴") ||
    (promotion.kind || "").includes("결합");

  if (isUserSubscribed && isPartnership) {
    return { text: "내 구독 연결 · 제휴 혜택", isHighlight: true };
  }
  if (isUserSubscribed && (promotion.kind?.includes("연간") || promotion.category === "학생/연간")) {
    return { text: "내 구독 연결 · 연간 혜택", isHighlight: true };
  }
  if (isUserSubscribed && (promotion.kind?.includes("무료 체험") || promotion.category === "100원/무료")) {
    return { text: "신규 가입 혜택", isHighlight: false };
  }
  if (isUserSubscribed) {
    return { text: "내 구독 연결 혜택", isHighlight: true };
  }
  return { text: promotion.kind || (promotion.category + " 추천"), isHighlight: false };
}

export function PromotionScreen({ subscriptions = [], promotions = [], onOpenPromotion, contestMode = false }) {
  const [filter, setFilter] = useState("all");

  const userSubscribedServiceIds = useMemo(() => {
    const ids = new Set();
    subscriptions.forEach((sub) => {
      const sId = sub.service_id || sub.serviceId || sub.id;
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
      const sId = sub.service_id || sub.serviceId || sub.id;
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
    if (!isPersonalized) {
      return promotions.map((p) => ({ ...p, isDirectMatch: false, isCategoryMatch: false }));
    }

    const matched = [];
    const seenIds = new Set();

    for (const promo of promotions) {
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
      return (b.saving || 0) - (a.saving || 0);
    });

    return matched;
  }, [isPersonalized, promotions, userSubscribedServiceIds, userSubscribedCategories]);

  const dynamicFilters = useMemo(() => {
    if (!isPersonalized) {
      return [
        { id: "all", label: "전체" },
        { id: "100원/무료", label: "0원 · 무료" },
        { id: "OTT", label: "OTT 환승" },
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
      items.push({ id: "100원/무료", label: "0원 · 무료" });
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
      candidatePromotions.find((promotion) => promotion.isDirectMatch) ||
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
      const id = subscription.serviceId || subscription.service_id || subscription.id;
      return (contestDirectPromotion.sourceServiceIds || []).includes(id);
    }) || null;
  }, [contestDirectPromotion, subscriptions]);

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 select-none">
      {/* 1. 상단 타이틀 & 안내 헤더 */}
      <div className="pb-4">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#FF6F0F] tracking-tight">
          <Sparkles size={14} />
          <span>{isPersonalized ? "내 구독 맞춤 혜택 진단" : "AI 숨은 혜택 발굴 진단"}</span>
        </div>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-[#191F28]">
          {contestMode && contestDirectPromotion ? "절약할 선택지 살펴보기" : "놓치고 있던 숨은 혜택"}
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B7684] font-medium leading-relaxed">
          {contestMode && contestDirectPromotion
            ? "등록한 구독과 연결된 혜택을 살펴보고, 내게 적용되는 조건과 공식 출처를 확인해 보세요."
            : isPersonalized
            ? `회원님이 이용 중인 ${categorySummary} 카테고리 기반으로 놓치고 있던 제휴 및 할인 혜택을 분석했어요.`
            : "구독 중인 서비스가 없어 전체 혜택을 보여드려요. 구독을 추가하면 연결 가능한 혜택과 조건을 함께 확인할 수 있어요."}
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
                  {Number(contestDirectPromotion.saving) > 0
                    ? `${Number(contestDirectPromotion.saving).toLocaleString("ko-KR")}원 / 월`
                    : "조건 확인 필요"}
                </dd>
              </div>
              {contestDirectPromotion.membershipRequired && (
                <div className="grid grid-cols-[84px_1fr] gap-3 border-t border-[#F2F4F6] px-3.5 py-3">
                  <dt className="font-semibold text-[#8B95A1]">멤버십 이용료</dt>
                  <dd className="m-0 font-semibold leading-5 text-[#333D4B]">{Number(contestDirectPromotion.membershipMonthlyPrice).toLocaleString("ko-KR")}원 / 월</dd>
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

            // 통일된 절약 금액 양식 산출
            const savingAmount = Number(promotion.saving) || 0;
            const isAnnual = promotion.kind?.includes("연간") || promotion.category === "학생/연간";
            const savingText = promotion.membershipRequired
              ? `별도 가격 월 ${Number(promotion.originalPrice).toLocaleString("ko-KR")}원 · 멤버십 필요`
              : savingAmount > 0
              ? (isAnnual ? `연 ${savingAmount.toLocaleString("ko-KR")}원 혜택 가치` : `월 ${savingAmount.toLocaleString("ko-KR")}원 혜택 가치`)
              : (promotion.offerPrice === 0 ? "0원 무료" : null);

            const offerPriceText = promotion.membershipRequired
              ? `멤버십 월 ${Number(promotion.membershipMonthlyPrice).toLocaleString("ko-KR")}원 필요`
              : promotion.offerPrice === 0
              ? "0원 무료"
              : (promotion.offerPrice ? `${Number(promotion.offerPrice).toLocaleString("ko-KR")}원` : null);

            return (
              <div key={promotion.id} className="w-full">
                <MacroPerkBlock
                  serviceId={displayInfo.serviceId}
                  serviceName={displayInfo.serviceName}
                  solutionTitle={displayInfo.solutionTitle}
                  description={promotion.description}
                  savingText={savingText}
                  offerPriceText={offerPriceText}
                  isDirectMatch={badgeInfo.isHighlight}
                  badgeText={badgeInfo.text}
                  onAction={() => onOpenPromotion(promotion)}
                />
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
