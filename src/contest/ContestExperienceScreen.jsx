import { DEFAULT_CHARACTER_SRC } from "../lib/characterAsset";

export function ContestExperienceScreen({
  onSimulatePayment,
  onOpenImageRegistration,
  onOpenPromotions,
  onTestReminder,
  onOpenCancellationGuide,
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] px-5 pb-10 pt-7 text-[#111827]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#3182F6]">CONTEST EXPERIENCE</p>
          <h1 className="mt-1 text-[24px] font-black tracking-tight">꾸독 공모전 체험</h1>
        </div>
        <a href="/" className="text-[12px] font-semibold text-[#6B7280] underline underline-offset-4">
          랜딩으로
        </a>
      </header>

      <section className="mt-6 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <img
            src={DEFAULT_CHARACTER_SRC}
            alt="꾸독이"
            className="h-[88px] w-[88px] shrink-0 object-contain"
          />
          <div>
            <p className="text-[12px] font-bold text-[#3182F6]">꾸독 컨시어지</p>
            <h2 className="mt-1 text-[18px] font-extrabold leading-7">
              꾸독의 핵심 흐름을 두 가지 상황으로 체험해볼게요.
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-[#6B7280]">
              저는 공모전 체험에 필요한 상황과 다음 행동만 안내합니다. 안내가 끝나면 꾸독의 실제 기능을 직접 사용해보세요.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-[#DCE8FF] bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.14em] text-[#3182F6]">SCENARIO A</span>
          <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-bold text-[#2563EB]">핵심 플로우</span>
        </div>
        <h2 className="mt-3 text-[20px] font-black">새로운 결제가 발생했다면</h2>
        <p className="mt-2 text-[13px] leading-5 text-[#6B7280]">
          테스트 결제 알림을 발생시킨 뒤 등록 → 혜택 → 리마인더 순서로 확인해보세요.
        </p>

        <ol className="mt-5 space-y-3">
          {[
            ["01", "테스트 결제 알림 보내기", "Netflix 17,000원 결제 감지 상황을 만듭니다."],
            ["02", "구독 등록", "감지된 서비스명·금액·결제수단을 확인하고 등록합니다."],
            ["03", "혜택 탐색", "내 구독 기반 프로모션과 외부 혜택 이동을 확인합니다."],
            ["04", "D-1 리마인더", "다음 결제 전 사전 알림을 테스트합니다."],
          ].map(([number, title, desc]) => (
            <li key={number} className="flex gap-3 border-t border-[#EEF0F3] pt-3 first:border-0 first:pt-0">
              <span className="text-[11px] font-black text-[#9CA3AF]">{number}</span>
              <div><strong className="block text-[13px]">{title}</strong><p className="mt-1 text-[12px] leading-5 text-[#6B7280]">{desc}</p></div>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-2">
          <button type="button" onClick={onSimulatePayment} className="min-h-[50px] rounded-2xl bg-[#111827] px-4 text-[14px] font-bold text-white active:scale-[0.99]">
            테스트 결제 알림 보내기
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onOpenPromotions} className="min-h-[46px] rounded-2xl border border-[#D1D5DB] bg-white text-[13px] font-bold">
              혜택 탭 보기
            </button>
            <button type="button" onClick={onTestReminder} className="min-h-[46px] rounded-2xl border border-[#D1D5DB] bg-white text-[13px] font-bold">
              리마인더 테스트
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.14em] text-[#0F766E]">SCENARIO B</span>
          <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#047857]">보완 플로우</span>
        </div>
        <h2 className="mt-3 text-[20px] font-black">놓친 결제가 있다면</h2>
        <p className="mt-2 text-[13px] leading-5 text-[#6B7280]">
          준비된 결제 캡처를 직접 업로드하고 AI 자동 추출 → 등록 → 해지 가이드까지 이어서 경험합니다.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
          <img src="/sample_receipt_netflix.png" alt="Scenario B에서 사용하는 Netflix 결제 샘플" className="w-full object-contain" />
        </div>

        <div className="mt-4 grid gap-2">
          <a
            href="/sample_receipt_netflix.png"
            download="kkudok-sample-receipt.png"
            className="flex min-h-[46px] items-center justify-center rounded-2xl border border-[#D1D5DB] bg-white text-[13px] font-bold"
          >
            샘플 결제 캡처 받기
          </a>
          <button type="button" onClick={onOpenImageRegistration} className="min-h-[50px] rounded-2xl bg-[#153D2E] px-4 text-[14px] font-bold text-white active:scale-[0.99]">
            AI 캡처 등록 시작
          </button>
          <button type="button" onClick={onOpenCancellationGuide} className="min-h-[46px] rounded-2xl border border-[#D1D5DB] bg-white text-[13px] font-bold">
            해지 가이드 체험
          </button>
        </div>
      </section>

      <p className="mt-6 px-2 text-center text-[11px] leading-5 text-[#9CA3AF]">
        공모전 체험용 가이드는 실제 결제 상황을 기다리지 않고 핵심 기능을 확인할 수 있도록 돕습니다.
      </p>
    </div>
  );
}
