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
    target: "nav-promotions",
    eyebrow: "체험 A · 5/8",
    title: "이제 방금 등록한 구독의 혜택을 확인해볼게요.",
    body: "하단의 ‘혜택’을 눌러주세요. 꾸독은 단순 지출 목록이 아니라, 등록된 구독을 기준으로 검증된 선택지를 연결하는 것을 목표로 합니다.",
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
  B1: {
    target: "contest-b-sample",
    eyebrow: "체험 B · 1/9",
    title: "이번에는 알림을 놓친 결제가 있다고 가정해볼게요.",
    body: "Netflix 결제 캡처를 저장해 직접 선택합니다. 등록 후에는 기존 Spotify 구독의 해지 방법을 살펴봅니다.",
  },
  B2: {
    target: "contest-b-upload-start",
    eyebrow: "체험 B · 2/9",
    title: "저장한 이미지를 직접 AI 등록 화면에 넣어보세요.",
    body: "버튼을 누르면 꾸독의 실제 이미지 등록 화면이 열립니다. 결과를 미리 주입하지 않습니다.",
  },
  B3: {
    target: "contest-image-upload",
    eyebrow: "체험 B · 3/9",
    title: "결제 캡처를 선택해주세요.",
    body: "이미지를 실제로 분석합니다. 결과를 확인해주세요. *OCR : 이미지 속 글자를 읽는 기술입니다.",
  },
  B4: {
    target: "contest-add-review",
    eyebrow: "체험 B · 4/9",
    title: "AI가 실제 이미지에서 읽어낸 결과입니다.",
    body: "서비스명·금액·결제일·결제수단을 확인해주세요. 틀린 값은 사용자가 수정할 수 있습니다.",
    continueLabel: "등록 단계로",
    next: "B5",
  },
  B5: {
    target: "contest-add-save",
    eyebrow: "체험 B · 5/9",
    title: "확인한 정보를 실제 구독으로 등록해주세요.",
    body: "등록이 끝나면 기존 Spotify 구독을 선택해 해지 가이드까지 이어갑니다.",
  },
  B6: {
    target: "nav-subscriptions",
    eyebrow: "체험 B · 6/9",
    title: "이번에는 관리 중인 구독을 정리해볼게요.",
    body: "하단 ‘구독’ 탭을 눌러주세요.",
  },
  B7: {
    target: "subscription-seed-spotify",
    eyebrow: "체험 B · 7/9",
    title: "예시로 Spotify 구독을 선택해주세요.",
    body: "실제 구독 상세 화면에서 해지 경로를 확인합니다.",
  },
  B8: {
    target: "cancel-primary",
    eyebrow: "체험 B · 8/9",
    title: "이제 실제 해지 가이드를 시작해주세요.",
    body: "꾸독은 해지를 대신하지 않습니다. 공식 해지 페이지와 필요한 단계를 안내해 사용자가 직접 결정하고 완료하도록 돕습니다.",
  },
  B9: {
    target: "cancel-open-site",
    eyebrow: "체험 B · 9/9",
    title: "공식 해지 페이지로 이동해 안내를 확인해보세요.",
    body: "웹에서는 공식 페이지를 새 탭으로 열고, 안드로이드 앱에서는 앱 안의 해지 안내를 사용할 수 있습니다.",
  },
  B10: {
    eyebrow: "체험 B · 완료",
    title: "놓친 결제를 복원하고 정리하는 흐름을 확인했습니다.",
    body: "이미지 → 실제 AI 인식 → 사용자 확인 → 등록 → 해지 가이드까지 하나의 관리 흐름으로 연결됩니다.",
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
  const [rect, setRect] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(false);
  }, [flow?.step]);

  useEffect(() => {
    if (!guide?.target) {
      setRect(null);
      return;
    }

    let frame;
    let scrollTimer;
    let hasAutoScrolled = false;

    const update = () => {
      frame = requestAnimationFrame(() => {
        const element = document.querySelector(`[data-contest-target="${guide.target}"]`);
        if (element && !hasAutoScrolled) {
          const bounds = element.getBoundingClientRect();
          const topSafe = 72;
          const bottomSafe = window.innerHeight - 210;
          if (bounds.top < topSafe || bounds.bottom > bottomSafe) {
            hasAutoScrolled = true;
            element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            scrollTimer = window.setTimeout(() => {
              setRect(measureTarget(guide.target));
            }, 280);
          } else {
            hasAutoScrolled = true;
          }
        }
        setRect(measureTarget(guide.target));
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
  }, [guide?.target, flow?.step]);

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
            {guide.target && !targetExists && (
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
