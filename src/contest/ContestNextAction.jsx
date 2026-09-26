export function ContestNextAction({ scenario, subscription, ocrRecognized = true, onBenefits, onDetail }) {
  if (!subscription || !["A", "B"].includes(scenario)) return null;

  return (
    <section className="contest-next-action" aria-labelledby="contest-next-action-title">
      <span>체험 {scenario} · 등록 완료</span>
      <h2 id="contest-next-action-title">{subscription.name}을(를) 등록했어요. 다음에 무엇을 확인할까요?</h2>
      <p>등록한 구독을 기준으로 혜택 후보를 살펴보거나, 구독 상세에서 정보를 관리할 수 있어요. 원하는 항목을 직접 선택해주세요.</p>
      {scenario === "B" && !ocrRecognized && <p role="status">이미지 분석 결과가 아닌 직접 입력으로 등록했어요. 이미지 인식에 성공한 것으로 표시하지 않습니다.</p>}
      <div className="contest-next-action-buttons">
        <button type="button" data-contest-target="contest-view-benefits" onClick={onBenefits}>관련 혜택 후보 보기</button>
        <button type="button" data-contest-target="contest-view-detail" onClick={onDetail}>등록한 구독 상세 보기</button>
      </div>
    </section>
  );
}
