export function ContestPaymentHeadsUp({ payment, onOpen, onDismiss }) {
  if (!payment) return null;
  const amount = Number(payment.amount || 0).toLocaleString("ko-KR");

  return (
    <div className="contest-headsup-wrap" data-contest-target="contest-payment-headsup">
      <div className="contest-headsup" role="status" aria-live="assertive">
        <div className="contest-headsup-top">
          <div>
            <span className="contest-headsup-app">꾸독</span>
            <span className="contest-headsup-now">지금</span>
          </div>
          <button type="button" onClick={onDismiss} aria-label="결제 감지 알림 닫기">×</button>
        </div>
        <button type="button" className="contest-headsup-body" onClick={onOpen}>
          <strong>⚡ {payment.serviceName} 결제 감지 ({amount}원)</strong>
          <span>결제 알림에서 구독 정보를 찾았습니다. 눌러서 읽어낸 내용을 확인해주세요.</span>
          <small>웹 체험용 화면 알림 · 안드로이드 앱에서는 시스템 알림을 사용합니다</small>
        </button>
      </div>
    </div>
  );
}
