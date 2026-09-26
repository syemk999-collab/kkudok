import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CHARACTER_SRC } from "../lib/characterAsset";

const GUIDE = {
  A1: {
    target: "contest-a-start",
    eyebrow: "체험 A · 1/8",
    title: "새로운 결제가 발생한 상황부터 시작해볼게요.",
    body: "테스트 결제를 실행하면 결제 문장에서 서비스명과 금액을 읽고, 웹 화면에 결제 알림을 보여줍니다.",
  },
  A2: {
    target: "contest-payment-headsup",
    eyebrow: "체험 A · 2/8",
    title: "방금 도착한 결제 알림을 눌러보세요.",
    body: "웹은 다른 앱의 알림을 읽을 수 없습니다. 같은 카드사 결제 문장을 실제 기능으로 읽어 화면 알림으로 보여줍니다. 안드로이드 앱은 허용된 시스템 알림을 감지합니다.",
  },
  A3: {
    target: "contest-add-review",
    eyebrow: "체험 A · 3/8",
    title: "꾸독이 결제 원문에서 필요한 정보를 읽었습니다.",
    body: "서비스명, 금액, 요금제, 결제수단이 맞는지 확인해보세요. 읽어낸 값을 바로 확정하지 않고 사용자가 먼저 살펴봅니다.",
    continueLabel: "등록 단계로",
    next: "A4",
  },
  A4: {
    target: "contest-add-save",
    eyebrow: "체험 A · 4/8",
    title: "정보가 맞다면 실제로 구독에 등록해주세요.",
    body: "‘내 구독에 추가’를 누르면 이 구독을 기준으로 혜택을 연결할 수 있습니다.",
  },
  A5: {
    target: "contest-view-benefits",
    eyebrow: "체험 A · 5/8",
    title: "등록한 구독에서 다음에 확인할 일을 골라보세요.",
    body: "관련 혜택 후보를 살펴보거나 등록한 구독의 상세 정보를 확인할 수 있어요. 두 선택 모두 방금 등록한 구독에서 시작합니다.",
  },
  A6: {
    target: "contest-benefit-source",
    eyebrow: "체험 A · 6/8",
    title: "내 구독에서 절약할 선택지인지 살펴보세요.",
    body: "지금 내는 금액과 멤버십 이용료·변경될 상품을 비교해 보세요. 적용 조건과 혜택 기간을 읽은 뒤 ‘공식 출처에서 조건 확인하기’를 눌러주세요.",
  },
  A7: {
    target: "notification-center-button",
    eyebrow: "체험 A · 7/8",
    title: "마지막으로 다음 결제를 미리 챙기는 흐름입니다.",
    body: "상단 알림 버튼을 열어 테스트 알림을 만들어보세요. *D-1 : 다음 결제일 하루 전이라는 뜻입니다.",
  },
  A8: {
    target: "contest-reminder-test",
    eyebrow: "체험 A · 8/8",
    title: "결제 하루 전 테스트 알림을 만들어보세요.",
    body: "알림 센터에 결제 하루 전 항목을 만들고, 기기 권한이 허용되어 있으면 기기 알림도 보냅니다.",
  },
  A9: {
    eyebrow: "체험 A · 완료",
    title: "실시간 감지부터 혜택과 다음 결제까지 확인했습니다.",
    body: "결제 발견 → 구조화 → 등록 → 혜택 검토 → 리마인더가 하나의 흐름으로 연결됩니다.",
    complete: true,
  },
  A10: {
    eyebrow: "체험 A · 등록 완료",
    title: "방금 등록한 구독의 상세 화면입니다.",
    body: "요금과 결제일을 다시 확인할 수 있어요. 해지 방법이 필요할 때는 사용자가 직접 선택합니다.",
    complete: true,
  },
  A11: {
    target: "registered-subscription",
    eyebrow: "체험 A · 구독 목록",
    title: "방금 등록한 구독을 선택해보세요.",
    body: "목록에서 등록한 구독의 요금과 결제일을 확인할 수 있습니다.",
  },
  B1: {
    target: "contest-b-sample",
    eyebrow: "체험 B · 1/7",
    title: "이번에는 알림을 놓친 결제가 있다고 가정해볼게요.",
    body: "Netflix 결제 캡처를 저장해 직접 선택합니다. 등록한 뒤 필요한 다음 행동을 고릅니다.",
  },
  B2: {
    target: "contest-b-upload-start",
    eyebrow: "체험 B · 2/7",
    title: "저장한 이미지를 직접 AI 등록 화면에 넣어보세요.",
    body: "버튼을 누르면 꾸독의 실제 이미지 등록 화면이 열립니다. 결과를 미리 주입하지 않습니다.",
  },
  B3: {
    target: "contest-image-upload",
    eyebrow: "체험 B · 3/7",
    title: "결제 캡처를 선택해주세요.",
    body: "이미지를 실제로 분석합니다. 결과를 확인해주세요. *OCR : 이미지 속 글자를 읽는 기술입니다.",
  },
  B4: {
    target: "contest-add-review",
    eyebrow: "체험 B · 4/7",
    title: "분석된 내용을 확인해 주세요.",
    body: "서비스명·금액·결제일·결제수단을 살펴보세요. 맞으면 그대로 확인하고, 누락되거나 틀린 값만 수정해주세요.",
    continueLabel: "등록 단계로",
    next: "B5",
  },
  B5: {
    target: "contest-add-save",
    eyebrow: "체험 B · 5/7",
    title: "확인한 정보를 실제 구독으로 등록해주세요.",
    body: "등록이 끝나면 방금 등록한 구독에서 혜택 후보나 상세 정보를 직접 선택할 수 있습니다.",
  },
  B6: {
    target: "contest-view-benefits",
    eyebrow: "체험 B · 6/7",
    title: "등록한 Netflix에서 다음에 확인할 일을 골라보세요.",
    body: "혜택 후보의 조건을 살펴보거나 구독 상세에서 등록한 값을 다시 볼 수 있어요. 분석값을 일부러 수정할 필요는 없습니다.",
  },
  B7: {
    target: "contest-benefit-source",
    eyebrow: "체험 B · 7/7",
    title: "연결된 혜택의 조건과 공식 출처를 살펴보세요.",
    body: "구독이 연결돼도 내 계정에 혜택이 적용됐다는 뜻은 아닙니다. 비용·상품 변경·공식 조건을 확인하고 판단하세요. 관련 후보가 없다면 목록에서 확인할 수 있어요.",
    continueLabel: "체험 마치기",
    next: "B8",
  },
  B8: {
    eyebrow: "체험 B · 완료",
    title: "등록한 구독의 혜택 목록을 살펴봤습니다.",
    body: "관련 후보가 없을 수도 있고, 이미지 분석에 실패했다면 직접 입력으로 등록했을 수도 있습니다. 가격 정보가 부족하면 개인 예상 금액을 보여주지 않습니다.",
    complete: true,
  },
  B9: {
    eyebrow: "체험 B · 등록 완료",
    title: "등록한 구독의 상세 화면입니다.",
    body: "추출된 요금과 결제일을 다시 확인할 수 있어요. 해지 방법이 필요해지면 사용자가 직접 선택합니다.",
    complete: true,
  },
  B10: {
    target: "registered-subscription",
    eyebrow: "체험 B · 구독 목록",
    title: "방금 등록한 구독을 선택해보세요.",
    body: "분석한 값을 확인하거나 수정한 뒤 등록한 구독이 목록에 나타납니다.",
  },
  C1: {
    target: "contest-cancel-example-start",
    eyebrow: "별도 체험 · 1/3",
    title: "네이버플러스 멤버십 해지 안내를 살펴볼게요.",
    body: "이 구독은 해지 안내를 보여주기 위한 체험용 예시입니다. 실제 사용자의 구독이나 계정이 아닙니다.",
  },
  C2: {
    target: "cancel-primary",
    eyebrow: "별도 체험 · 2/3",
    title: "해지 방법을 직접 선택해주세요.",
    body: "네이버플러스 멤버십 상세에서 ‘해지 방법 보기’를 눌러 안내를 확인하세요.",
  },
  C3: {
    target: "cancel-open-site",
    eyebrow: "별도 체험 · 3/3",
    title: "공식 페이지의 해지 경로를 확인해보세요.",
    body: "웹에서는 단계별 방법과 공식 링크를 제공합니다. 안드로이드 앱에서는 확인 가능한 버튼만 강조하며, 최종 해지는 사용자가 직접 선택합니다.",
  },
  C4: {
    eyebrow: "별도 체험 · 완료",
    title: "네이버플러스 멤버십 해지 경로를 확인했습니다.",
    body: "공식 사이트에서 실제로 해지를 완료했는지는 꾸독이 대신 판단하지 않습니다.",
    complete: true,
  },
};

function measureTarget(targetName) {
  if (!targetName || typeof document === "undefined") return null;
  const element = document.querySelector(`[data-contest-target="${targetName}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    top: Math.max(6, rect.top - 6),
    left: Math.max(6, rect.left - 6),
    width: Math.min(window.innerWidth - 12, rect.width + 12),
    height: rect.height + 12,
  };
}

export function ContestGuideOverlay({ flow, onStep, onExit }) {
  const guide = flow?.step ? GUIDE[flow.step] : null;
  const target = guide?.target === "registered-subscription"
    ? `subscription-${flow?.addedSubscriptionId}` : guide?.target;
  const [rect, setRect] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(false);
  }, [flow?.step]);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    let frame;
    let scrollTimer;
    let hasAutoScrolled = false;

    const update = () => {
      frame = requestAnimationFrame(() => {
        const element = document.querySelector(`[data-contest-target="${target}"]`);
        if (element && !hasAutoScrolled) {
          const bounds = element.getBoundingClientRect();
          const topSafe = 72;
          const bottomSafe = window.innerHeight - 210;
          if (bounds.top < topSafe || bounds.bottom > bottomSafe) {
            hasAutoScrolled = true;
            element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            scrollTimer = window.setTimeout(() => {
              setRect(measureTarget(target));
            }, 280);
          } else {
            hasAutoScrolled = true;
          }
        }
        setRect(measureTarget(target));
      });
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelAnimationFrame(frame);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target, flow?.step]);

  const targetExists = useMemo(() => Boolean(rect), [rect]);
  const placement = useMemo(() => {
    if (!rect || typeof window === "undefined") return "is-bottom";
    return rect.top > window.innerHeight * 0.56 ? "is-top" : "is-bottom";
  }, [rect]);

  if (!guide || !flow?.scenario) return null;

  return (
    <>
      {rect && (
        <div
          className="contest-guide-spotlight"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          aria-hidden="true"
        />
      )}

      <aside className={`contest-guide-panel ${placement} ${collapsed ? "is-collapsed" : ""}`} aria-live="polite">
        <img src={DEFAULT_CHARACTER_SRC} alt="꾸독이" className="contest-guide-character" />
        <button
          type="button"
          className="contest-guide-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "컨시어지 안내 펼치기" : "컨시어지 안내 접기"}
        >
          {collapsed ? "안내 보기" : "접기"}
        </button>

        {!collapsed && (
          <div className="contest-guide-copy">
            <span>{guide.eyebrow}</span>
            <strong>{guide.title}</strong>
            <p>{guide.body}</p>
            {target && !targetExists && (
              <small>안내할 화면을 불러오는 중이에요.</small>
            )}
            <div className="contest-guide-actions">
              {guide.continueLabel && (
                <button type="button" onClick={() => onStep?.(guide.next)}>
                  {guide.continueLabel}
                </button>
              )}
              {guide.complete && (
                <a href="/#/contest" onClick={onExit}>다른 시나리오 체험하기</a>
              )}
              <button type="button" className="contest-guide-exit" onClick={onExit}>
                체험 안내 종료
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export function getContestGuide(step) {
  return GUIDE[step] || null;
}
