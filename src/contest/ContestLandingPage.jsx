import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { promotionCatalog } from "../data/subscriptionData";
import "./contest.css";

const EXPERIENCE_URL = "/#/contest";
const DEMO_VIDEO_URL = import.meta.env.VITE_CONTEST_DEMO_URL || "/assets/contest/kkudok-demo.mp4";
const QR_IMAGE_URL = "/assets/contest/contest-experience-qr.svg"

const TECH_STACK = ["React", "Next.js / Vite", "Gemini AI", "ChatGPT", "Supabase", "Vercel"];

const HERO_FEATURES = [
  {
    icon: "📷",
    title: "AI 영수증 · 결제 문자 자동 파싱",
    description: "스크린샷 한 장으로 서비스명, 결제금액, 결제일, 결제수단까지 1초 만에 자동 분류",
    tone: "blue",
  },
  {
    icon: "◇",
    title: "공식 출처 검증 제휴 절약 혜택",
    description: "과장된 혜택 없이 통신사·카드사 제휴와 연간 전환 실질 절약액만 신뢰도",
    tone: "cyan",
  },
  {
    icon: "●",
    title: "선제적 결제 리마인더 & 간편 해지",
    description: "결제 전 D-Day 사전 알림 및 지난 결제 건 점검으로 불필요한 자동 결제 온",
    tone: "amber",
  },
];

function formatWon(value) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}

function HeroPhoneDemo() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {}
    } else {
      video.pause();
    }
  };

  return (
    <div className="contest-hero-device-wrap">
      <div className="contest-hero-orbit" aria-hidden="true" />
      <div className="contest-hero-phone">
        <div className="contest-hero-phone-camera" aria-hidden="true" />
        <video
          ref={videoRef}
          src={DEMO_VIDEO_URL}
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          aria-label="꾸독 전체 서비스 시연 영상"
        />
        <button
          type="button"
          className={"contest-hero-play " + (playing ? "is-playing" : "")}
          onClick={toggle}
          aria-label={playing ? "시연 영상 일시정지" : "시연 영상 재생"}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
      </div>
      <p>실제 서비스 시연 영상입니다 · 휴대폰 화면에서 바로 재생</p>
    </div>
  );
}

function ScenarioSummary({ label, title, description, steps }) {
  return (
    <article className="contest-scenario-summary">
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <ol>
        {steps.map((step, index) => (
          <li key={step}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function ContestLandingPage() {
  const [experienceQr, setExperienceQr] = useState("");

  useEffect(() => {
    let active = true;
    // The preview QR must open this very deployment. Production uses the same
    // path on the production origin after the approved merge.
    const url = new URL(EXPERIENCE_URL, window.location.origin).href;
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 4, width: 296 })
      .then((image) => { if (active) setExperienceQr(image); })
      .catch(() => {
        if (active && window.location.origin === "https://kkudok-kohl.vercel.app") {
          setExperienceQr(QR_IMAGE_URL);
        }
      });
    return () => { active = false; };
  }, []);
  const verifiedBenefit = useMemo(
    () => promotionCatalog.find((promotion) => promotion.id === "naverplus-netflix") || null,
    []
  );

  const sourceHost = useMemo(() => {
    try {
      return verifiedBenefit?.link ? new URL(verifiedBenefit.link).hostname : "";
    } catch {
      return "";
    }
  }, [verifiedBenefit]);

  return (
    <main className="contest-page">
      <section className="contest-hero" aria-labelledby="contest-hero-title">
        <div className="contest-shell contest-hero-layout">
          <div className="contest-hero-copy">
            <div className="contest-top-badges">
              <span className="contest-top-badge is-primary">🏆 윈터드 AI Championship 2026 출품작</span>
              <span className="contest-top-badge">↗ kkudok-kohl.vercel.app</span>
            </div>

            <div className="contest-brand-lockup">
              <strong className="contest-re-mark" aria-hidden="true">RƐ.</strong>
              <div><span>구독 관리 서비스</span><b>꾸독</b></div>
            </div>

            <h1 id="contest-hero-title">
              <span>결제는 <em>AI로 읽고,</em></span>
              <span>절약액은 <em>검증해서 보여줍니다.</em></span>
            </h1>

            <div className="contest-hero-features" aria-label="꾸독 주요 기능">
              {HERO_FEATURES.map((feature) => (
                <article key={feature.title}>
                  <div className={"contest-feature-symbol is-" + feature.tone} aria-hidden="true">{feature.icon}</div>
                  <div>
                    <h2>{feature.title}</h2>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="contest-tech-row" aria-label="기술 스택">
              {TECH_STACK.map((item) => <span key={item}>{item}</span>)}
            </div>

            <div className="contest-hero-experience">
              {experienceQr ? <img src={experienceQr} alt="휴대폰으로 이 배포의 꾸독 공모전 체험에 접속하는 QR 코드" /> : <span className="contest-qr-pending">QR 준비 중</span>}
              <div>
                <strong>휴대폰으로 꾸독 직접 체험하기</strong>
                <span>QR 스캔 · 설치 없이 바로 체험</span>
                <a href={EXPERIENCE_URL}>이 브라우저에서 체험하기 →</a>
              </div>
            </div>
          </div>

          <HeroPhoneDemo />
        </div>
      </section>

      <section className="contest-section contest-demo-section" id="full-demo" aria-labelledby="full-demo-title">
        <div className="contest-shell">
          <div className="contest-section-heading">
            <span>FULL PRODUCT DEMO</span>
            <h2 id="full-demo-title">꾸독은 이렇게 작동합니다.</h2>
            <p>
              결제를 발견하고, 구독으로 정리하고, 혜택을 확인하고,
              다음 결제와 해지까지 이어지는 실제 서비스 흐름을 확인해보세요.
            </p>
          </div>

          <div className="contest-demo-stage">
            <div className="contest-demo-story">
              <strong>영상에서 확인할 흐름</strong>
              {[
                ["01", "결제 발견", "새로운 결제 또는 놓친 결제를 찾습니다."],
                ["02", "구독 정보화", "결제 정보를 사용자가 확인할 수 있는 구조로 정리합니다."],
                ["03", "혜택 발견", "등록된 구독과 연결되는 선택지를 찾습니다."],
                ["04", "다음 행동", "리마인더와 해지 가이드로 실제 행동까지 이어집니다."],
              ].map(([n, title, body]) => (
                <div className="contest-demo-story-row" key={n}>
                  <span>{n}</span>
                  <div><b>{title}</b><p>{body}</p></div>
                </div>
              ))}
            </div>

            <div className="contest-demo-video">
              <video controls playsInline preload="metadata" src={DEMO_VIDEO_URL} aria-label="꾸독 전체 서비스 시연 영상" />
              <div><strong>전체 서비스 시연</strong><span>02:13 · 세로 원본 비율 유지 · crop 없음</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="contest-section contest-scenario-section" aria-labelledby="scenario-heading">
        <div className="contest-shell">
          <div className="contest-section-heading is-left">
            <span>REAL-WORLD SCENARIOS</span>
            <h2 id="scenario-heading">구독을 발견하는 순간은 모두 같지 않습니다.</h2>
            <p>새로운 결제는 바로 감지하고, 놓친 결제는 실제 캡처를 다시 읽어 관리 가능한 정보로 복원합니다.</p>
          </div>

          <div className="contest-scenario-grid">
            <ScenarioSummary
              label="SCENARIO A · 핵심 플로우"
              title="새로운 결제가 발생했다면"
              description="웹 체험에서는 테스트 결제 원문을 실제 웹 파서에 통과시키고 Heads-up → 등록 → 혜택 → D-1 리마인더로 이어집니다. Android에서는 Notification Listener가 실제 시스템 알림을 감지합니다."
              steps={["결제 알림 감지", "실제 파싱 결과 확인", "구독 등록", "검증된 혜택 확인", "D-1 리마인더"]}
            />
            <ScenarioSummary
              label="SCENARIO B · 보완 플로우"
              title="놓친 결제가 있다면"
              description="준비된 결제 캡처를 직접 선택하고 실제 /api/ocr 결과를 확인한 뒤 등록합니다. 이후 기존 구독의 해지 가이드까지 직접 경험합니다."
              steps={["결제 캡처 저장", "직접 이미지 업로드", "실제 AI/OCR 분석", "사용자 확인 후 등록", "해지 가이드"]}
            />
          </div>
        </div>
      </section>

      <section className="contest-section contest-benefit-section" aria-labelledby="benefit-heading">
        <div className="contest-shell">
          <div className="contest-section-heading is-left">
            <span>VERIFIED BENEFIT</span>
            <h2 id="benefit-heading">파싱은 시작이고, 차이는 그 다음에 있습니다.</h2>
            <p>
              꾸독은 “얼마를 썼는지”에서 끝나지 않고, 등록된 구독을 기준으로 실제 적용 가능한 혜택을 찾고
              조건과 공식 출처를 함께 보여주는 방향으로 정확도를 높이고 있습니다.
            </p>
          </div>

          {verifiedBenefit && (
            <article className="contest-benefit-proof">
              <div className="contest-benefit-current">
                <span>현재 구독과 연결</span>
                <strong>Netflix</strong>
                <p>Scenario A에서 등록된 서비스와 직접 연결되는 혜택 예시</p>
              </div>
              <div className="contest-benefit-arrow" aria-hidden="true">→</div>
              <div className="contest-benefit-evidence">
                <div className="contest-benefit-evidence-top">
                  <span>{verifiedBenefit.verifiedStatus === "LIVE_CONFIRMED" ? "공식 출처 확인" : "조건 확인 필요"}</span>
                  <small>{sourceHost}</small>
                </div>
                <h3>{verifiedBenefit.title}</h3>
                <strong>{verifiedBenefit.subtitle}</strong>
                <p>{verifiedBenefit.description}</p>
                <dl>
                  <div><dt>적용 조건</dt><dd>{verifiedBenefit.campaignPeriod}</dd></div>
                  <div><dt>혜택 기간</dt><dd>{verifiedBenefit.benefitPeriod}</dd></div>
                  <div><dt>카탈로그 기준 혜택 가치</dt><dd>{formatWon(verifiedBenefit.saving)} / 월</dd></div>
                  <div><dt>공식 출처</dt><dd>{sourceHost}</dd></div>
                </dl>
                <small className="contest-benefit-caution">
                  실제 절약액은 현재 플랜, 기존 멤버십 보유 여부와 선택하는 이용권에 따라 달라질 수 있습니다.
                  꾸독은 조건과 출처를 보여주고 사용자가 직접 판단하도록 돕습니다.
                </small>
                <a href={verifiedBenefit.link} target="_blank" rel="noreferrer">공식 출처에서 조건 확인하기 →</a>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="contest-section contest-parsing-section" aria-labelledby="parsing-heading">
        <div className="contest-shell">
          <div className="contest-section-heading">
            <span>AI PARSING</span>
            <h2 id="parsing-heading">결제 정보에서, 필요한 것만 읽습니다.</h2>
            <p>AI가 결과를 확정하지 않습니다. 실제 이미지에서 필요한 정보를 정리하고 사용자가 확인한 뒤 등록합니다.</p>
          </div>

          <div className="contest-parsing-layout">
            <div className="contest-parsing-input">
              <span>INPUT</span>
              <img src="/sample_receipt_netflix.png" alt="Scenario B에서 실제 OCR 입력으로 사용하는 Netflix 결제 캡처" loading="lazy" />
              <strong>실제 업로드 이미지</strong>
            </div>
            <div className="contest-parsing-steps">
              {[
                ["01", "IMAGE UPLOAD", "사용자가 직접 JPG · PNG · WEBP 이미지를 선택"],
                ["02", "/api/ocr", "브라우저에서 서버 API로 이미지를 전송"],
                ["03", "AI / OCR", "서비스명 · 금액 · 결제일 · 결제수단을 구조화"],
                ["04", "USER REVIEW", "사용자가 결과를 확인하고 필요한 경우 수정"],
                ["05", "SUBSCRIPTION", "확인된 정보만 구독 데이터로 등록"],
              ].map(([n, title, body]) => (
                <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="contest-section contest-direct-section" aria-labelledby="direct-heading">
        <div className="contest-shell contest-direct-card">
          <div>
            <span>DIRECT EXPERIENCE</span>
            <h2 id="direct-heading">이번에는 직접 경험해보세요.</h2>
            <p>QR은 휴대폰 카메라로 스캔하는 체험 진입점입니다. 데스크톱에서는 별도의 버튼으로 동일한 공모전 체험을 열 수 있습니다.</p>
            <a href={EXPERIENCE_URL}>이 브라우저에서 체험 시작하기</a>
          </div>
          <div className="contest-direct-qr">
              {experienceQr ? <img src={experienceQr} alt="이 배포의 꾸독 공모전 체험 QR 코드" /> : <span className="contest-qr-pending">QR 준비 중</span>}
            <strong>휴대폰으로 꾸독 직접 체험하기</strong>
            <span>Scenario A · Scenario B</span>
          </div>
        </div>
      </section>
    </main>
  );
}
