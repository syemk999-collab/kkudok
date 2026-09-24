import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { promotionCatalog } from "../data/subscriptionData";
import "./contest.css";

const EXPERIENCE_URL = "/#/contest";
const DEMO_VIDEO_URL = import.meta.env.VITE_CONTEST_DEMO_URL || "/assets/contest/kkudok-demo.mp4";
const DEMO_POSTER_URL = "/assets/contest/kkudok-demo-poster.jpg";
const QR_IMAGE_URL = "/assets/contest/contest-experience-qr.svg"

const TECH_STACK = ["React", "Next.js / Vite", "Gemini AI", "ChatGPT", "Supabase", "Vercel"];

const HERO_FEATURES = [
  {
    icon: "01",
    title: "결제 정보를 읽어 등록 부담 줄이기",
    description: "결제 알림이나 캡처에서 구독 정보를 정리합니다. 확인하고 등록하는 것은 사용자 몫입니다.",
    term: "*파싱 : 결제 문장에서 서비스명·금액·결제수단 등을 찾아 정리하는 과정입니다.",
    tone: "blue",
  },
  {
    icon: "02",
    title: "꾸독이와 해지 방법 찾기",
    description: "해지하고 싶을 때 다음에 누를 곳과 공식 해지 경로를 안내합니다. 해지는 사용자가 직접 결정합니다.",
    term: "*컨시어지 : 꾸독이가 화면에서 다음 행동을 알려주는 안내 역할입니다.",
    tone: "amber",
  },
  {
    icon: "03",
    title: "놓치기 쉬운 혜택의 조건 확인하기",
    description: "내 구독과 연결될 수 있는 혜택 후보의 조건·기간·공식 출처를 보고 직접 판단합니다.",
    term: "*혜택 가치 : 혜택에 포함된 상품의 별도 가격입니다. 내 확정 절약액은 아닙니다.",
    tone: "cyan",
  },
];

function formatWon(value) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}

function HeroPhoneDemo({ onPlay, videoRef, started, onStarted }) {
  return (
    <div className="contest-hero-device-wrap" id="full-demo">
      <div className="contest-hero-orbit" aria-hidden="true" />
      <div className="contest-hero-phone">
        <div className="contest-hero-phone-camera" aria-hidden="true" />
        <video
          id="contest-hero-demo-player"
          ref={videoRef}
          src={DEMO_VIDEO_URL}
          poster={DEMO_POSTER_URL}
          controls={started}
          playsInline
          preload="metadata"
          onPlay={onStarted}
          aria-label="꾸독 전체 서비스 시연 영상"
        />
        {!started && (
          <button
            type="button"
            className="contest-hero-play"
            onClick={onPlay}
            aria-label="전체 서비스 시연 영상 재생"
            aria-controls="contest-hero-demo-player"
          >
            ▶
          </button>
        )}
      </div>
      <p>전체 서비스 시연 · 02:13</p>
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
  const demoVideoRef = useRef(null);
  const [demoStarted, setDemoStarted] = useState(false);

  const playFullDemo = (scrollToVideo = false) => {
    const video = demoVideoRef.current;
    if (!video) return;
    setDemoStarted(true);
    video.play().catch(() => video.focus());
    if (scrollToVideo) {
      video.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#") || hash.startsWith("#/")) return;
    let targetId;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    // The QR always opens the contest experience on the current deployment.
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
        <div className="contest-shell contest-hero-frame">
          <header className="contest-hero-nav">
            <a className="contest-hero-nav-brand" href="#contest-hero-title" aria-label="꾸독 소개로 이동"><span>RƐ.</span><strong>꾸독</strong></a>
            <nav aria-label="공모전 페이지 탐색">
              <a href="#full-demo">서비스 시연</a>
              <a href="#scenario-heading">체험 시나리오</a>
              <a href="#benefit-heading">혜택 검증</a>
            </nav>
            <a className="contest-hero-nav-cta" href="#experience-qr">QR로 체험하기 ↓</a>
          </header>
          <div className="contest-hero-layout">
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

            <p className="contest-hero-intro">결제 정보를 정리하고, 해지 경로를 안내하며, 내 구독과 연결될 수 있는 혜택을 찾습니다. 등록·변경·해지는 직접 결정하세요.</p>

            <div className="contest-hero-example" aria-label="Netflix 구독과 연결되는 혜택 예시">
              <span>NETFLIX 구독을 등록했다면</span>
              <strong>네이버플러스 연계 혜택의 조건과 출처를 확인</strong>
              <small>혜택 적용과 실제 절약액은 요금제·멤버십 상태에 따라 달라집니다.</small>
            </div>

            <div className="contest-hero-experience" id="experience-qr">
              {experienceQr ? <img src={experienceQr} alt="휴대폰 카메라로 스캔하면 꾸독 공모전 체험으로 이동하는 QR 코드" /> : <span className="contest-qr-pending">QR 준비 중</span>}
              <div>
                <span className="contest-qr-eyebrow">SCAN TO EXPERIENCE · 01 / 02</span>
                <strong>휴대폰 카메라로 QR을 스캔해주세요.</strong>
                <span>설치 없이 Scenario A와 B를 직접 체험할 수 있어요.</span>
                <span className="contest-mobile-open-hint">이 휴대폰에서 보고 있다면 아래 링크로 시작하세요.</span>
                <a className="contest-browser-link" href={EXPERIENCE_URL}>이 기기에서 바로 체험하기 ↗</a>
              </div>
            </div>

            <button className="contest-hero-demo-link" type="button" onClick={() => playFullDemo(true)}>먼저 전체 서비스 시연 보기 <span aria-hidden="true">▶</span></button>

            <div className="contest-hero-features" aria-label="꾸독이 덜어주는 세 가지 부담">
              {HERO_FEATURES.map((feature) => (
                <article key={feature.title}>
                  <div className={"contest-feature-symbol is-" + feature.tone} aria-hidden="true">{feature.icon}</div>
                  <div>
                    <h2>{feature.title}</h2>
                    <p>{feature.description}</p>
                    <p className="contest-feature-term">{feature.term}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="contest-tech-row" aria-label="기술 스택">
              {TECH_STACK.map((item) => <span key={item}>{item}</span>)}
            </div>

          </div>

          <HeroPhoneDemo onPlay={() => playFullDemo()} videoRef={demoVideoRef} started={demoStarted} onStarted={() => setDemoStarted(true)} />
          </div>
          <div className="contest-hero-footer" aria-hidden="true">
            <span>SCROLL TO EXPLORE <i>↓</i></span>
            <span>PAYMENT · GUIDANCE · BENEFITS</span>
            <span>01 / 03</span>
          </div>
        </div>
      </section>

      <section className="contest-section contest-scenario-section" aria-labelledby="scenario-heading">
        <div className="contest-shell">
          <div className="contest-section-heading is-left">
            <span>REAL-WORLD SCENARIOS</span>
            <h2 id="scenario-heading">구독을 발견하는 순간은 모두 같지 않습니다.</h2>
            <p>웹에서는 새 결제를 테스트 문장으로 읽고, 놓친 결제는 직접 선택한 캡처에서 확인합니다.</p>
          </div>

          <div className="contest-scenario-grid">
            <ScenarioSummary
              label="SCENARIO A · 핵심 플로우"
              title="새로운 결제가 발생했다면"
              description="웹에서는 테스트 결제 문장을 실제 결제 정보 읽기 기능에 넣고, 화면 알림 → 등록 → 혜택 → 다음 결제 알림을 체험합니다. Android 앱은 사용자가 허용한 시스템 결제 알림을 감지합니다."
              steps={["테스트 결제 문장 읽기", "읽어낸 정보 확인", "구독 등록", "연결된 혜택 확인", "결제 하루 전 알림"]}
            />
            <ScenarioSummary
              label="SCENARIO B · 보완 플로우"
              title="놓친 결제가 있다면"
              description="Netflix 결제 캡처를 직접 선택해 분석 결과를 확인·수정하고 등록합니다. 이어서 기존 Spotify 구독의 해지 경로를 살펴봅니다."
              steps={["결제 캡처 저장", "직접 이미지 선택", "실제 이미지 글자 인식", "사용자 확인 후 등록", "꾸독이 해지 안내"]}
            />
          </div>
          <p className="contest-scenario-note">*OCR : 이미지에 담긴 글자를 읽어 결제 정보로 정리하는 기술입니다. 이미지를 선택하면 실제 /api/ocr 요청으로 분석합니다.</p>
        </div>
      </section>

      <section className="contest-section contest-benefit-section" aria-labelledby="benefit-heading">
        <div className="contest-shell">
          <div className="contest-section-heading is-left">
            <span>VERIFIED BENEFIT</span>
            <h2 id="benefit-heading">파싱은 시작이고, 차이는 그 다음에 있습니다.</h2>
            <p>
              꾸독은 “얼마를 썼는지”에서 끝나지 않고, 등록된 구독과 연결될 수 있는 혜택 후보를 찾고
              조건과 공식 출처를 함께 보여줍니다. 적용 여부와 실제 절약액은 사용자의 요금제와 멤버십 상태에 따라 달라집니다.
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
                  <div><dt>광고형 상품 별도 가격</dt><dd>{formatWon(verifiedBenefit.originalPrice)} / 월</dd></div>
                  <div><dt>네이버플러스 이용료</dt><dd>{formatWon(verifiedBenefit.membershipMonthlyPrice)} / 월</dd></div>
                  <div><dt>공식 출처</dt><dd>{sourceHost}</dd></div>
                </dl>
                <small className="contest-benefit-caution">
                  *별도 가격 : 넷플릭스에서 광고형 스탠다드를 단독 구독할 때의 가격입니다. 네이버플러스에서는 회차마다 디지털 콘텐츠 중 하나를 선택합니다.
                  현재 프리미엄 요금제로 이용 중이라면 광고형 스탠다드로 전환되며, 실제 절약액은 기존 멤버십 보유 여부와 선택 상품에 따라 달라집니다.
                </small>
                <a href={verifiedBenefit.link} target="_blank" rel="noreferrer">공식 출처에서 조건 확인하기 →</a>
                {verifiedBenefit.priceSourceUrl && <a href={verifiedBenefit.priceSourceUrl} target="_blank" rel="noreferrer">넷플릭스 별도 요금 확인하기 →</a>}
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
            <p className="contest-section-term">*파싱 : 결제 문장에서 필요한 정보를 찾아 정리하는 일입니다. *OCR : 이미지 속 글자를 읽는 기술입니다.</p>
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
          <div className="contest-direct-qr">
            {experienceQr ? <img src={experienceQr} alt="휴대폰 카메라로 스캔하면 꾸독 공모전 체험으로 이동하는 QR 코드" /> : <span className="contest-qr-pending">QR 준비 중</span>}
            <strong>휴대폰으로 스캔하기</strong>
            <span>설치 없이 바로 시작</span>
          </div>
          <div className="contest-direct-copy">
            <span>DIRECT EXPERIENCE · SCAN TO BEGIN</span>
            <h2 id="direct-heading">이번에는 직접 경험해보세요.</h2>
            <p>휴대폰 카메라로 QR을 스캔하면 Scenario A와 B를 직접 체험할 수 있습니다. 결제 정보 확인부터 꾸독이의 해지 안내, 혜택의 공식 근거까지 살펴보세요.</p>
            <a className="contest-browser-link" href={EXPERIENCE_URL}>이 기기에서 바로 체험하기 ↗</a>
          </div>
        </div>
      </section>
    </main>
  );
}
