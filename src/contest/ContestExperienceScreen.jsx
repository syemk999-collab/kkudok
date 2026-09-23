import { DEFAULT_CHARACTER_SRC } from "../lib/characterAsset";

export function ContestExperienceScreen({
  flow,
  onStartScenario,
  onRunPayment,
  onSampleReady,
  onOpenImageRegistration,
  onReset,
}) {
  const scenario = flow?.scenario;
  const step = flow?.step;

  if (!scenario) {
    return (
      <main className="contest-experience-shell">
        <header className="contest-experience-header">
          <div>
            <span>CONTEST EXPERIENCE</span>
            <h1>꾸독을 직접 경험해보세요.</h1>
          </div>
          <a href="/">랜딩으로 돌아가기</a>
        </header>

        <section className="contest-concierge-intro">
          <img src={DEFAULT_CHARACTER_SRC} alt="꾸독이" />
          <div>
            <span>꾸독 컨시어지</span>
            <h2>두 가지 실제 상황으로 핵심 기능을 안내할게요.</h2>
            <p>
              저는 공모전 체험에서 다음에 무엇을 해야 하는지만 안내합니다.
              실제 결제 감지·AI 인식·혜택 확인·해지 기능은 꾸독의 기존 기능을 그대로 사용합니다.
            </p>
          </div>
        </section>

        <section className="contest-scenario-picker" aria-label="체험 시나리오 선택">
          <button type="button" onClick={() => onStartScenario?.("A")}>
            <span>SCENARIO A</span>
            <strong>새로운 결제가 발생했다면</strong>
            <p>결제 알림 → 파싱 → 등록 → 검증된 혜택 → D-1 리마인더</p>
            <small>실시간 결제 감지와 혜택 발견</small>
          </button>
          <button type="button" onClick={() => onStartScenario?.("B")}>
            <span>SCENARIO B</span>
            <strong>놓친 결제가 있다면</strong>
            <p>실제 캡처 업로드 → /api/ocr → 결과 확인 → 등록 → 해지 가이드</p>
            <small>과거 결제 복원과 정리</small>
          </button>
        </section>

        <div className="contest-experience-truth">
          <strong>체험 환경을 실제 기능과 구분해 보여드립니다.</strong>
          <p>
            모바일 웹은 다른 앱의 알림을 직접 읽을 수 없기 때문에 Scenario A의 웹 체험은
            테스트 결제 원문을 실제 웹 파서에 통과시켜 Heads-up으로 보여줍니다.
            Android 앱에서는 Notification Listener 기반 시스템 알림 감지가 동작합니다.
          </p>
        </div>
      </main>
    );
  }

  if (scenario === "A" && step === "A1") {
    return (
      <main className="contest-experience-shell contest-experience-focus">
        <header className="contest-experience-header">
          <div>
            <span>SCENARIO A · START</span>
            <h1>새로운 결제가 발생한 상황</h1>
          </div>
          <button type="button" onClick={onReset}>처음으로</button>
        </header>

        <section className="contest-focus-card">
          <img src={DEFAULT_CHARACTER_SRC} alt="꾸독이" />
          <div className="contest-focus-copy">
            <span>꾸독 컨시어지</span>
            <h2>테스트 결제 원문을 실제 파서로 읽어볼게요.</h2>
            <p>
              아래 이벤트는 결과값을 미리 주입하지 않습니다. 카드사 알림과 같은 원문을 파싱한 결과가
              Heads-up 알림과 구독 등록 화면으로 이어집니다.
            </p>
            <div className="contest-raw-event" aria-label="테스트 결제 알림 원문">
              <span>[신한카드] 결제승인</span>
              <strong>넷플릭스 17,000원(일시불) 정상승인</strong>
            </div>
            <button
              type="button"
              className="contest-focus-primary"
              data-contest-target="contest-a-start"
              onClick={onRunPayment}
            >
              테스트 결제 발생시키기
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (scenario === "B" && (step === "B1" || step === "B2")) {
    const ready = step === "B2";
    return (
      <main className="contest-experience-shell contest-experience-focus">
        <header className="contest-experience-header">
          <div>
            <span>SCENARIO B · START</span>
            <h1>놓친 결제를 다시 불러오는 상황</h1>
          </div>
          <button type="button" onClick={onReset}>처음으로</button>
        </header>

        <section className="contest-focus-card contest-focus-card-receipt">
          <img className="contest-focus-character-small" src={DEFAULT_CHARACTER_SRC} alt="꾸독이" />
          <div className="contest-focus-copy">
            <span>꾸독 컨시어지</span>
            <h2>{ready ? "이제 저장한 이미지를 직접 업로드해주세요." : "먼저 실제 결제 캡처를 준비해주세요."}</h2>
            <p>
              샘플 이미지는 입력값일 뿐입니다. 꾸독은 업로드된 이미지를 실제 /api/ocr로 분석하고,
              반환된 값을 사용자가 확인한 뒤에만 구독으로 등록합니다.
            </p>

            <div className="contest-sample-receipt">
              <img src="/sample_receipt_netflix.png" alt="Scenario B용 Netflix 결제 캡처 샘플" />
              <div>
                <strong>공모전용 실제 입력 이미지</strong>
                <span>PNG · 결과 데이터가 아닌 OCR 입력 원본</span>
              </div>
            </div>

            {!ready ? (
              <a
                href="/sample_receipt_netflix.png"
                download="kkudok-sample-receipt.png"
                data-contest-target="contest-b-sample"
                className="contest-focus-primary"
                onClick={onSampleReady}
              >
                샘플 결제 캡처 저장하기
              </a>
            ) : (
              <button
                type="button"
                className="contest-focus-primary"
                data-contest-target="contest-b-upload-start"
                onClick={onOpenImageRegistration}
              >
                AI 캡처 등록 화면 열기
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="contest-experience-shell">
      <section className="contest-concierge-intro">
          <img src={DEFAULT_CHARACTER_SRC} alt="꾸독이" />
        <div>
          <span>꾸독 컨시어지</span>
          <h2>현재 체험 단계를 이어가는 중이에요.</h2>
          <p>화면에 표시되는 안내를 따라 실제 꾸독 UI를 사용해주세요.</p>
        </div>
      </section>
    </main>
  );
}
