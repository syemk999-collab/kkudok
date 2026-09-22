const KNOWN_SERVICES = [
  { id: "netflix", name: "Netflix", category: "OTT", strictAmountCheck: false, amounts: [5500, 13500, 17000], aliases: ["넷플릭스", "netflix.com"] },
  { id: "youtube", name: "YouTube Premium", category: "OTT", strictAmountCheck: false, amounts: [8690, 10450, 14900], aliases: ["유튜브", "youtube", "google youtube", "구글유튜브"] },
  { id: "tving", name: "티빙", category: "OTT", strictAmountCheck: false, amounts: [5500, 9500, 13500, 17000], aliases: ["tving", "cj enm"] },
  { id: "disney", name: "Disney+", category: "OTT", strictAmountCheck: false, amounts: [9900, 13900, 99000, 139000], aliases: ["디즈니+", "디즈니플러스", "disneyplus", "disney"] },
  { id: "watcha", name: "왓챠", category: "OTT", strictAmountCheck: false, amounts: [7900, 12900], aliases: ["watcha"] },
  { id: "wavve", name: "웨이브", category: "OTT", strictAmountCheck: false, amounts: [7900, 10900, 13900], aliases: ["wavve"] },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", strictAmountCheck: true, amounts: [4990, 7890], aliases: ["쿠팡", "coupang", "쿠팡와우", "와우멤버십"] },
  { id: "naver", name: "네이버플러스 멤버십", category: "쇼핑", strictAmountCheck: true, amounts: [4900, 46800], aliases: ["네이버플러스", "네이버멤버십", "네이버"] },
  { id: "spotify", name: "Spotify", category: "음악", strictAmountCheck: false, amounts: [8690, 10900, 11990, 17900], aliases: ["스포티파이"] },
  { id: "melon", name: "멜론", category: "음악", strictAmountCheck: false, amounts: [7900, 10900, 11900], aliases: ["melon"] },
  { id: "chatgpt", name: "ChatGPT Plus", category: "AI/생산성", strictAmountCheck: false, amounts: [27000, 29000], aliases: ["챗gpt", "chatgpt", "openai", "챗지피티"] },
  { id: "notion", name: "Notion", category: "AI/생산성", strictAmountCheck: false, amounts: [11000, 13500, 20000], aliases: ["노션"] },
  { id: "adobe", name: "Adobe", category: "AI/생산성", strictAmountCheck: false, amounts: [13200, 26400, 35200, 61600], aliases: ["어도비"] },
  { id: "claude", name: "Claude Pro", category: "AI/생산성", strictAmountCheck: false, amounts: [27000, 29000], aliases: ["클로드", "anthropic"] },
  { id: "millie", name: "밀리의서재", category: "도서", strictAmountCheck: false, amounts: [9900, 99000], aliases: ["밀리", "밀리의 서재"] },
  { id: "apple", name: "Apple One", category: "기타", strictAmountCheck: true, amounts: [14900, 20900, 3300, 4400, 8900], aliases: ["apple.com/bill", "애플"] },
];

const AMOUNT_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원|\$\s*([0-9]+(?:\.[0-9]{2})?)/g;
const RECURRING_PATTERN = /(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간)/;
const NEGATIVE_PATTERN = /(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)/;
const BUSINESS_SUFFIX_PATTERN = /(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)/;

function compact(value = "") {
  return String(value).toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");
}

function detectPaymentMethod(packageName = "", text = "") {
  const pkg = String(packageName);
  if (pkg.includes("shcard") || text.includes("신한")) return "신한카드";
  if (pkg.includes("kbcard") || pkg.includes("kbstar") || text.includes("KB") || text.includes("국민")) return "KB국민카드";
  if (pkg.includes("hyundaicard") || text.includes("현대")) return "현대카드";
  if (pkg.includes("samsungcard") || text.includes("삼성카드")) return "삼성카드";
  if (pkg.includes("wooricard") || text.includes("우리")) return "우리카드";
  if (pkg.includes("lotte") || text.includes("롯데")) return "롯데카드";
  if (pkg.includes("hana") || text.includes("하나")) return "하나카드";
  if (pkg.includes("nh.smart") || text.includes("농협")) return "NH농협카드";
  if (pkg.includes("kakaopay") || text.includes("카카오페이")) return "카카오페이";
  if (pkg.includes("toss") || text.includes("토스")) return "토스페이";
  if (pkg.includes("nhn") || text.includes("네이버페이")) return "네이버페이";
  if (pkg.includes("spay") || text.includes("삼성월렛") || text.includes("삼성페이")) return "삼성월렛";
  return "신용/체크카드";
}

function inferPlan(serviceId, amount, text = "") {
  const lower = text.toLowerCase();
  if (text.includes("프리미엄") || lower.includes("premium")) return "프리미엄";
  if (text.includes("스탠다드") || lower.includes("standard")) return "스탠다드";
  if (text.includes("베이직") || lower.includes("basic")) return "베이직";
  if (text.includes("와우")) return "와우 멤버십";
  if (serviceId !== "disney" && text.includes("플러스")) return "Plus";
  if (serviceId === "netflix") {
    if (amount === 17000) return "프리미엄";
    if (amount === 13500) return "스탠다드";
    if (amount === 5500) return "광고형 스탠다드";
  }
  if (serviceId === "youtube" && amount === 14900) return "개인 멤버십";
  if (serviceId === "coupang" && [7890, 4990].includes(amount)) return "와우 멤버십";
  if (serviceId === "disney") {
    if (amount === 9900) return "스탠다드";
    if (amount === 13900) return "프리미엄";
  }
  if (serviceId === "tving") {
    if (amount === 13500) return "스탠다드";
    if (amount === 17000) return "프리미엄";
    if (amount === 5500) return "광고형 스탠다드";
  }
  return "기본 플랜";
}

function extractFallbackName(text) {
  const match = text.match(/(?:가맹점명|가맹점|상호명|서비스)[:：\s]*([가-힣a-zA-Z0-9]+)/);
  return match?.[1]?.trim() || "신규 구독 서비스";
}

export function parsePaymentNotification({ packageName = "", title = "", body = "" } = {}) {
  const safeTitle = String(title || "");
  const safeBody = String(body || "");
  const combined = (safeTitle + " " + safeBody).trim();

  if (!combined || NEGATIVE_PATTERN.test(combined)) return null;

  AMOUNT_PATTERN.lastIndex = 0;
  let amount = 0;
  for (const match of combined.matchAll(AMOUNT_PATTERN)) {
    if (match[1]) {
      amount = Number(match[1].replaceAll(",", "")) || 0;
    } else if (match[2]) {
      amount = Math.round((Number(match[2]) || 0) * 1350);
    }
    if (amount > 0) break;
  }
  if (!amount) return null;

  const compactCombined = compact(combined);
  let bestMatch = null;
  let longest = 0;

  for (const service of KNOWN_SERVICES) {
    const aliases = [service.name, ...(service.aliases || [])];
    for (const alias of aliases) {
      const normalized = compact(alias);
      if (normalized && compactCombined.includes(normalized) && normalized.length > longest) {
        bestMatch = service;
        longest = normalized.length;
      }
    }
  }

  if (bestMatch) {
    const suffix = combined.match(BUSINESS_SUFFIX_PATTERN)?.[1];
    if (suffix) {
      const aliases = [bestMatch.name, ...(bestMatch.aliases || [])];
      if (aliases.some((alias) => combined.toLowerCase().includes((alias + suffix).toLowerCase()))) {
        return null;
      }
    }
  }

  const hasRecurringKeyword = RECURRING_PATTERN.test(combined);
  if (bestMatch?.strictAmountCheck && !bestMatch.amounts.includes(amount) && !hasRecurringKeyword) {
    return null;
  }

  if (!bestMatch && !hasRecurringKeyword) return null;

  const serviceId = bestMatch?.id || "";
  const serviceName = bestMatch?.name || extractFallbackName(combined);

  return {
    serviceId,
    serviceName,
    name: serviceName,
    category: bestMatch?.category || "기타",
    plan: inferPlan(serviceId, amount, combined),
    amount,
    paymentMethod: detectPaymentMethod(packageName, combined),
    isSubscription: true,
    rawText: combined,
    sourceType: "notification",
  };
}

export function createContestPaymentEvent() {
  return {
    packageName: "com.shcard.smartpay",
    title: "[신한카드] 결제승인",
    body: "넷플릭스 17,000원(일시불) 정상승인",
  };
}

export function toQuickAddData(parsed, now = new Date()) {
  if (!parsed?.isSubscription) return null;
  return {
    name: parsed.serviceName || parsed.name || "",
    amount: Number(parsed.amount) || 0,
    plan: parsed.plan || "",
    paymentMethod: parsed.paymentMethod || "",
    category: parsed.category || "기타",
    serviceId: parsed.serviceId || "",
    dueDay: now.getDate(),
    billingCycle: "매월",
    sourceType: "notification",
    autoDetected: true,
  };
}

export const paymentParserKnownServices = KNOWN_SERVICES;
