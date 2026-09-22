import "./contest.css";

const EXPERIENCE_URL = "/#/contest";
const DEMO_VIDEO_URL = import.meta.env.VITE_CONTEST_DEMO_URL || "/assets/contest/kkudok-demo.mp4";
const QR_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbwAAAG8AQAAAACNyy1yAAACW0lEQVR4nO2cUY7kIAxEq1b7T+5/u7kBnMD7gQHTnZmdyY6aJVP+QHSHJ4JUMsZAaLhk5dc1DhAoUKBAgQIFChQo8Msgux1AGRXAy6nB0lcV+NPBZNVqHckA8AAPIFktR4O1ryrwx4PDZ1Z3CliGvXVHGhp8U48CBX7Ffp//XWgAkyEZC8/yWhuNUeCdQcsgicI6+7+gR4EC/2bDr3ZFsonTyoFCK0TKscG/9ShQ4DVrWm0xajUmY8qjfGqw1RgF3gN0rUafaYC1GNUKq0qf4oCNxijwHiA8E5XMMix7wspye5w8T2XZW7rljcYo8B7grFXz0tdTyWqDWu+PpFWBC7X64FRdrtHH9gWX/KrANeDQ6nCtza8Ol2vDwUqrAheBTZCxksOMX38CMaCVVgWu1epQI0I80MIDezBpVeCrwUmEMUadFlxdz5BfFbgKDFrN7wSoOay5suJVgavAscdKgCkzZQPY/rFy1H0rK7TpYMBGYxR4D3COAcJiPwYDPYg15VcFLgNDkiqN7aox3YdsgItWWhW4BgznAcIs349asT2tEcJ39ChQ4EU78avpMSfg1rNY8qsCV8erI2rN7VHI//dDAtKqwMV7AdWG50R3rQ95V2lV4MqcVYtFe+aKT4da5+PWG41R4D3AKb/qd1UKra2n6iVBV6nWVgL/M7B+FqDfCiTpkWohyQ/Ayz0KFPgJO7lz7VP/fNXamuNtmauNxijwbmDfnwKAQste1op/euWNrc2WYxS4M3iSBxipgLDrqrMrAleDp99U+YTpW8ECBQoUKFCgQIECXwH+ARm8ak9FomGnAAAAAElFTkSuQmCC";

const TECH_STACK = ["React", "Next.js / Vite", "Gemini AI", "ChatGPT", "Supabase", "Vercel"];

const FLOW_STEPS = [
  "결제 발견",
  "구독 등록",
  "혜택 확인",
  "다음 결제 관리",
  "놓친 결제 등록",
  "해지 가이드",
];

const SCENARIO_A = [
  "실시간 결제 감지",
  "결제 정보 확인",
  "원클릭 구독 등록",
  "내 구독 기반 혜택 발견",
  "외부 혜택 확인",
  "D-1 결제 리마인더",
];

const SCENARIO_B = [
  "결제 캡처 준비",
  "이미지 업로드",
  "AI 자동 추출",
  "결과 확인 및 등록",
  "불필요한 구독 선택",
  "해지 가이드",
  "실제 해지 페이지 이동",
];

function FlowList({ items }) {
  return (
    <ol className="contest-flow-list">
      {items.map((item, index) => (
        <li key={item}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{item}</strong>
        </li>
      ))}
    </ol>
  );
}

function PhonePreview() {
  return (
    <a className="contest-phone-stage" href="#full-demo" aria-label="전체 시연 영상으로 이동">
      <div className="contest-phone-glow" aria-hidden="true" />
      <div className="contest-phone">
        <div className="contest-phone-camera" aria-hidden="true" />
        <div className="contest-phone-screen">
          <div className="contest-phone-status">
            <span>9:41</span>
            <span>5G · 75%</span>
          </div>

          <div className="contest-phone-appbar">
            <strong>꾸독</strong>
            <span>구독 관리</span>
          </div>

          <div className="contest-phone-benefit-banner">
            <span>이번 달<br />얼마나 절약할 수 있을까요?</span>
            <strong>꾸독</strong>
          </div>

          <div className="contest-phone-summary">
            <span>이번 달 예상 절약액</span>
            <strong>24,600<small>원</small></strong>
            <em>최근 3개월 대비<br /><b>+12,800원</b></em>
          </div>

          <div className="contest-phone-section-title">
            <strong>내 구독 <small>6</small></strong>
            <span>전체보기 〉</span>
          </div>

          <div className="contest-phone-subscriptions">
            <div><b>N</b><span>Netflix<small>다음 결제일 10월 12일</small></span><strong>17,000원</strong></div>
            <div><b>S</b><span>Spotify<small>다음 결제일 10월 14일</small></span><strong>10,900원</strong></div>
            <div><b>N+</b><span>네이버플러스 멤버십<small>다음 결제일 10월 20일</small></span><strong>4,900원</strong></div>
            <div><b>Y</b><span>YouTube Premium<small>다음 결제일 10월 22일</small></span><strong>14,900원</strong></div>
          </div>

          <div className="contest-phone-nav">
            <span>홈</span><span>구독</span><span>혜택</span><span>더보기</span>
          </div>
        </div>

        <span className="contest-phone-play" aria-hidden="true">▶</span>
      </div>
      <p>실제 서비스 전체 흐름 보기</p>
    </a>
  );
}

export default function ContestLandingPage() {
  return (
    <main className="contest-page">
      <section className="contest-section contest-hero" aria-labelledby="contest-hero-title">
        <div className="contest-container contest-hero-grid">
          <div className="contest-hero-copy">
            <div className="contest-badges">
              <span className="contest-badge contest-badge-primary">🏆 윈터드 AI Championship 2026 출품작</span>
              <a className="contest-badge" href="https://kkudok-kohl.vercel.app" target="_blank" rel="noreferrer">
                kkudok-kohl.vercel.app
              </a>
            </div>

            <div className="contest-brand">
              <div className="contest-brand-mark" aria-hidden="true">RƐ.</div>
              <div>
                <span>구독 관리 서비스</span>
                <strong>꾸독</strong>
              </div>
            </div>

            <h1 id="contest-hero-title">
              결제는 <em>AI로 읽고,</em><br />
              절약액은 <em>검증해서 보여줍니다.</em>
            </h1>

            <div className="contest-feature-stack" aria-label="꾸독 핵심 기능">
              <article>
                <span className="contest-feature-number">01</span>
                <div>
                  <h2>AI 영수증 · 결제 문자 자동 파싱</h2>
                  <p>스크린샷 한 장으로 서비스명, 결제금액, 결제일, 결제수단까지 1초 만에 자동 분류</p>
                </div>
              </article>
              <article>
                <span className="contest-feature-number">02</span>
                <div>
                  <h2>공식 출처 검증 제휴 절약 혜택</h2>
                  <p>과장된 혜택 없이 통신사·카드사 제휴와 연간 전환 실질 절약액만 신뢰도</p>
                </div>
              </article>
              <article>
                <span className="contest-feature-number">03</span>
                <div>
                  <h2>선제적 결제 리마인더 &amp; 간편 해지</h2>
                  <p>결제 전 D-Day 사전 알림 및 지난 결제 건 점검으로 불필요한 자동 결제 온</p>
                </div>
              </article>
            </div>

            <div className="contest-tech-stack" aria-label="기술 스택">
              {TECH_STACK.map((item) => <span key={item}>{item}</span>)}
            </div>

            <div className="contest-experience-card">
              <img src={QR_DATA_URI} alt="꾸독 공모전 체험 QR 코드" />
              <div>
                <strong>휴대폰으로 꾸독 직접 체험하기</strong>
                <p>QR 스캔 · 설치 없이 바로 체험</p>
                <a href={EXPERIENCE_URL}>앱 체험하기 →</a>
              </div>
            </div>

            <a className="contest-scroll-link" href="#full-demo">
              꾸독이 실제로 어떻게 작동하는지 확인해보세요.
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <PhonePreview />
        </div>
      </section>

      <section className="contest-section contest-demo" id="full-demo" aria-labelledby="full-demo-title">
        <div className="contest-container">
          <div className="contest-section-heading">
            <span>FULL PRODUCT DEMO</span>
            <h2 id="full-demo-title">꾸독은 이렇게 작동합니다.</h2>
            <p>결제를 발견하고, 구독으로 정리하고, 혜택을 확인하고, 다음 결제와 해지까지 이어지는 전체 흐름을 확인해보세요.</p>
          </div>

          <div className="contest-demo-stage">
            <div className="contest-demo-flow">
              <span className="contest-demo-kicker">EXPERIENCE FLOW</span>
              <FlowList items={FLOW_STEPS} />
              <p>영상은 실제 꾸독 서비스 사용 흐름을 그대로 담았습니다.</p>
            </div>

            <div className="contest-video-shell">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/assets/contest/demo-poster.svg"
                aria-label="꾸독 전체 서비스 시연 영상"
              >
                <source src={DEMO_VIDEO_URL} type="video/mp4" />
                브라우저가 동영상 재생을 지원하지 않습니다.
              </video>
              <div className="contest-video-meta">
                <strong>전체 서비스 시연</strong>
                <span>02:13 · 원본 비율 유지</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contest-section contest-scenarios" aria-labelledby="scenario-title">
        <div className="contest-container">
          <div className="contest-section-heading contest-section-heading-left">
            <span>REAL-WORLD SCENARIOS</span>
            <h2 id="scenario-title">구독을 발견하는 순간은 모두 같지 않습니다.</h2>
            <p>새로운 결제를 바로 발견할 수도 있고, 이미 지나간 결제를 뒤늦게 정리해야 할 수도 있습니다.</p>
          </div>

          <div className="contest-scenario-grid">
            <article className="contest-scenario-card">
              <div className="contest-scenario-topline">
                <span>SCENARIO A</span>
                <small>핵심 플로우</small>
              </div>
              <h3>새로운 결제가 발생했다면</h3>
              <p>결제 문자나 카드사 알림에서 구독 결제를 감지하고, 등록 이후 혜택과 다음 결제 관리까지 이어집니다.</p>
              <FlowList items={SCENARIO_A} />
              <div className="contest-scenario-note">
                공모전 체험에서는 실제 결제를 기다리지 않고 테스트 결제 알림으로 시작합니다.
              </div>
            </article>

            <article className="contest-scenario-card">
              <div className="contest-scenario-topline">
                <span>SCENARIO B</span>
                <small>보완 플로우</small>
              </div>
              <h3>놓친 결제가 있다면</h3>
              <p>이미 지나간 결제도 캡처 화면을 불러와 필요한 정보를 먼저 정리하고, 사용자가 확인한 뒤 관리할 수 있습니다.</p>
              <FlowList items={SCENARIO_B} />
              <div className="contest-scenario-note">
                준비된 결제 캡처를 직접 업로드해 AI 자동 추출과 해지 가이드를 순서대로 경험합니다.
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="contest-section contest-parsing" aria-labelledby="parsing-title">
        <div className="contest-container">
          <div className="contest-section-heading">
            <span>AI PARSING</span>
            <h2 id="parsing-title">결제 정보에서, 필요한 것만 읽습니다.</h2>
            <p>꾸독은 영수증과 결제 화면에서 구독 관리에 필요한 정보를 읽고, 사용자가 확인할 수 있는 형태로 정리합니다.</p>
          </div>

          <div className="contest-parsing-proof">
            <div className="contest-receipt-preview">
              <span>INPUT</span>
              <img src="/sample_receipt_netflix.png" alt="AI 파싱 체험에 사용하는 Netflix 결제 샘플" loading="lazy" />
            </div>

            <div className="contest-parsing-pipeline" aria-label="AI 파싱 처리 단계">
              <article>
                <span>01</span>
                <h3>INPUT</h3>
                <p>영수증 · 결제 화면 · 결제 캡처 · 결제 문자</p>
              </article>
              <article>
                <span>02</span>
                <h3>AI PARSING</h3>
                <p>서비스명 · 결제 금액 · 결제일 · 결제수단 · 결제주기</p>
              </article>
              <article>
                <span>03</span>
                <h3>USER REVIEW</h3>
                <p>자동 추출 결과를 확인하고 필요한 항목은 직접 수정합니다.</p>
              </article>
              <article>
                <span>04</span>
                <h3>RESULT</h3>
                <p>확인된 정보를 관리 가능한 구독 데이터로 등록합니다.</p>
              </article>
            </div>

            <div className="contest-parsed-result">
              <span>STRUCTURED RESULT</span>
              <dl>
                <div><dt>서비스</dt><dd>Netflix</dd></div>
                <div><dt>결제 금액</dt><dd>17,000원</dd></div>
                <div><dt>결제 주기</dt><dd>매월</dd></div>
                <div><dt>결제 수단</dt><dd>사용자 확인</dd></div>
              </dl>
              <p>AI가 결과를 확정하는 것이 아니라, 필요한 정보를 먼저 정리하고 사용자가 확인합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="contest-section contest-final-cta" aria-labelledby="experience-title">
        <div className="contest-container contest-final-card">
          <div>
            <span className="contest-final-kicker">DIRECT EXPERIENCE</span>
            <h2 id="experience-title">이번에는 직접 경험해보세요.</h2>
            <p>공모전 체험 화면에서 컨시어지가 두 가지 상황을 순서대로 안내합니다. 안내 이후에는 꾸독의 실제 기능을 직접 사용합니다.</p>
            <a className="contest-primary-cta" href={EXPERIENCE_URL}>꾸독 체험 시작하기</a>
          </div>

          <div className="contest-final-qr">
            <img src={QR_DATA_URI} alt="꾸독 직접 체험 QR 코드" />
            <strong>휴대폰으로 꾸독 직접 체험하기</strong>
            <span>Scenario A · Scenario B</span>
          </div>
        </div>
      </section>

      <footer className="contest-footer">
        <div className="contest-container">
          <strong>꾸독</strong>
          <span>AI 구독 관리 서비스 · Winter AI Championship 2026</span>
        </div>
      </footer>
    </main>
  );
}
