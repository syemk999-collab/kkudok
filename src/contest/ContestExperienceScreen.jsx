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
            <p>*컨시어지 : 꾸독이가 지금 무엇을 확인하고 다음에 어디를 눌러야 하는지 알려주는 안내자입니다.</p>
          </div>
        </section>

        <section className="contest-scenario-picker" aria-label="체험 시나리오 선택">
          <button type="button" onClick={() => onStartScenario?.("A")}>
            <span>SCENARIO A</span>
            <strong>새로운 결제가 발생했다면</strong>
            <p>결제 정보 읽기 → 사용자 확인 후 등록 → 혜택 조건 확인 → 결제 하루 전 알림</p>
            <small>실시간 결제 감지와 혜택 발견</small>
          </button>
          <button type="button" onClick={() => onStartScenario?.("B")}>
            <span>SCENARIO B</span>
            <strong>놓친 결제가 있다면</strong>
            <p>캡처 이미지 선택 → 글자 인식 결과 확인 → 등록 → 꾸독이 해지 안내</p>
            <small>과거 결제 복원과 정리</small>
          </button>
        </section>

        <p className="contest-experience-glossary">*파싱 : 결제 문장에서 구독에 필요한 정보를 찾아 정리합니다. *OCR : 이미지 속 글자를 읽어 결제 정보를 정리합니다.</p>

        <div className="contest-experience-truth">
          <strong>체험 환경을 실제 기능과 구분해 보여드립니다.</strong>
          <p>
            모바일 웹은 다른 앱의 알림을 직접 읽을 수 없기 때문에 Scenario A의 웹 체험은
            카드사 테스트 결제 문장을 실제 결제 정보 읽기 기능으로 처리해 화면 알림으로 보여줍니다.
            Android 앱에서는 사용자가 허용한 시스템 결제 알림을 감지합니다.
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
            <h2>테스트 결제 문장을 실제 기능으로 읽어볼게요.</h2>
            <p>
              아래 카드사 결제 문장을 실제로 읽습니다. 결과를 미리 정해 놓지 않고,
              읽어낸 정보를 화면 알림과 구독 등록 화면에서 확인할 수 있습니다.
            </p>
            <p>*파싱 : 카드사 결제 문장에서 서비스명·금액·결제수단을 찾아 정리합니다.</p>
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
              샘플 이미지를 직접 선택하면 실제 이미지 글자 인식 기능으로 분석합니다.
              읽어낸 결과를 확인·수정한 뒤에만 구독으로 등록합니다.
            </p>
            <p>*OCR : 사진이나 캡처에 담긴 글자를 읽는 기술입니다. 선택한 이미지는 실제 /api/ocr로 전송합니다.</p>

            <div className="contest-sample-receipt">
              <img src="/sample_receipt_netflix.png" alt="Scenario B용 Netflix 결제 캡처 샘플" />
              <div>
                <strong>공모전용 실제 입력 이미지</strong>
                <span>PNG · 이미 분석된 결과가 아닌 이미지 원본</span>
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
          <button type="button" className="contest-focus-primary" onClick={onReset}>시나리오 다시 선택하기</button>
        </div>
      </section>
    </main>
  );
}
