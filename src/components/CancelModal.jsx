import { useEffect, useState, useMemo } from "react";
import { Check, CheckCircle2, ExternalLink, ShieldCheck, Layers, Sparkles, Globe } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { CancelBrowserModal } from "./CancelBrowserModal";
import { serviceCatalog } from "../data/subscriptionData";
import { NAVER_PLUS_CANCEL_STEPS, getCancelUrl, isNaverPlusSubscription, usesNaverPlusCancelEntry } from "../lib/naverPlusCancelGuide";
import { getProviderCancellation, identifyCancellationProvider } from "../lib/providerCancellation";
import {
  openCancelBrowser,
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingGuide,
  stopFloatingGuide,
} from "../lib/cancelBrowser";

const baseSteps = [
  "서비스 계정으로 로그인하기",
  "멤버십 또는 구독 관리 메뉴 열기",
  "해지 신청 후 완료 화면 확인하기",
];

export function CancelModal({ subscription: rawSub, promotion, autoOpen = false, tutorialOnly = false, onClose, onComplete, onToast, onExternalOpen }) {
  const providerId = identifyCancellationProvider(rawSub);
  const [purchaseSource, setPurchaseSource] = useState("unknown");
  // DB 구독 데이터에 guideSteps나 cancelUrl이 누락되어도 serviceCatalog에서 100% 매칭 보강
  const subscription = useMemo(() => {
    const targetName = (rawSub.name || "").toLowerCase().replace(/\s+/g, "");
    const targetId = (rawSub.id || rawSub.subscriptionId || "").toLowerCase();
    const matched = serviceCatalog.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sName = (s.name || "").toLowerCase().replace(/\s+/g, "");
      return sId === targetId || sName === targetName || targetId.includes(sId) || targetName.includes(sName);
    });

    const providerGuide = getProviderCancellation(rawSub, purchaseSource);
    return {
      ...rawSub,
      cancelUrl: providerGuide ? providerGuide.cancelUrl
        : getCancelUrl({ ...rawSub, cancelUrl: rawSub.cancelUrl || matched?.cancelUrl || "" }),
      guideSteps: providerGuide ? providerGuide.guideSteps : usesNaverPlusCancelEntry(rawSub)
        ? NAVER_PLUS_CANCEL_STEPS
        : isNaverPlusSubscription(rawSub) ? []
        : (rawSub.guideSteps && rawSub.guideSteps.length > 0) ? rawSub.guideSteps : (matched?.guideSteps || []),
      cancellationProvider: providerGuide?.id || null,
      cancellationPurchaseSource: providerGuide?.purchaseSource || null,
      cancellationNotice: providerGuide?.notice || "",
      cancellationHelpUrl: providerGuide?.helpUrl || "",
    };
  }, [rawSub, purchaseSource]);

  const steps = (subscription.guideSteps && subscription.guideSteps.length > 0)
    ? subscription.guideSteps.map((s) => ({ title: s.title, description: s.description }))
    : baseSteps.map((s) => ({ title: "", description: s }));
  const [checked, setChecked] = useState(() => new Array(steps.length).fill(false));
  const [celebrating, setCelebrating] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(() => Boolean(!providerId && autoOpen && getCancelUrl(rawSub)));
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [cancelSessionActive, setCancelSessionActive] = useState(false);

  useEffect(() => {
    let listenerPromise;
    if (Capacitor.isNativePlatform()) {
      listenerPromise = App.addListener("appStateChange", (state) => {
        if (state.isActive && cancelSessionActive && !tutorialOnly) {
          onToast?.("해지를 완료하셨다면 아래 '해지 완료했습니다' 버튼을 눌러주세요.");
        }
      });
    }
    return () => {
      listenerPromise?.then((h) => h.remove());
    };
  }, [cancelSessionActive, onToast, tutorialOnly]);

  const goToCancel = async () => {
    if (!subscription.cancelUrl) return;

    onExternalOpen?.(subscription);
    setCancelSessionActive(true);
    if (providerId && purchaseSource !== "web") {
      // Store-billed subscriptions cannot be inspected in Kkudok's WebView.
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      setShowBrowserModal(true);
      return;
    }

    const res = await openCancelBrowser({
      serviceId: providerId || subscription.id,
      serviceName: subscription.name,
      cancelUrl: subscription.cancelUrl,
      guideSteps: subscription.guideSteps,
    });

    if (res?.action === "COMPLETED" && !tutorialOnly) {
      complete();
      return;
    }

    if (res?.action === "FALLBACK_WEB") {
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      setShowBrowserModal(true);
      return;
    }

    if (!usesNaverPlusCancelEntry(subscription) && !providerId) {
      setChecked((current) => [true, ...current.slice(1)]);
    }
  };

  const openInSystemBrowser = () => {
    if (!subscription.cancelUrl) return;
    setCancelSessionActive(true);
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 기본 브라우저(Chrome)에서 열었어요.`);
    if (!usesNaverPlusCancelEntry(subscription) && !providerId) {
      setChecked((current) => [true, ...current.slice(1)]);
    }
  };

  const proceedWithoutOverlay = async () => {
    setShowPermissionPrompt(false);
    setCancelSessionActive(true);
    const res = await openCancelBrowser({
      serviceId: providerId || subscription.id,
      serviceName: subscription.name,
      cancelUrl: subscription.cancelUrl,
      guideSteps: subscription.guideSteps,
    });
    if (res?.action === "COMPLETED" && !tutorialOnly) {
      complete();
      return;
    }
    if (res?.action === "FALLBACK_WEB") {
      setShowBrowserModal(true);
      return;
    }
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 브라우저에서 열었어요.`);
    if (!usesNaverPlusCancelEntry(subscription)) {
      setChecked((current) => [true, ...current.slice(1)]);
    }
  };

  const handleRequestPermission = async () => {
    setShowPermissionPrompt(false);
    await requestOverlayPermission();
    onToast?.("권한을 켠 후 다시 [해지 페이지로 바로 이동]을 눌러주세요.");
  };

  const complete = () => {
    stopFloatingGuide();
    setCelebrating(true);
  };

  if (celebrating) {
    return (
      <BottomSheet
        onClose={() => {
          onComplete?.(subscription.subscriptionId, subscription.amount);
          onClose();
        }}
        label="해지 완료"
      >
        <div className="flex flex-col items-center px-2 pb-5 pt-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#191F28] text-white shadow-md"><CheckCircle2 size={31} /></span>
          <h2 className="mt-5 text-[22px] font-extrabold tracking-tight text-[#191F28]">구독 목록에서 정리할게요</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6B7684]">{subscription.name}의 실제 해지 완료 여부는 공식 사이트에서 확인해주세요. 꾸독에서 확인을 누르면 구독 목록에서 정리됩니다.</p>
          {promotion && (
            <div className="mt-4 w-full rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-3.5 text-left">
              <span className="rounded bg-[#FFE8CC] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6F0F]">추천 혜택</span>
              <p className="mt-1 text-[13px] font-bold text-[#191F28]">{promotion.title}</p>
              <button
                type="button"
                onClick={() => {
                  if (promotion.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
                }}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#FF6F0F] underline"
              >
                혜택 자세히 보기 <ExternalLink size={12} />
              </button>
            </div>
          )}
          <Button
            size="large"
            fullWidth
            className="mt-6"
            onClick={() => {
              onComplete?.(subscription.subscriptionId, subscription.amount);
              onClose();
            }}
          >
            확인 및 완료
          </Button>
        </div>
      </BottomSheet>
    );
  }

  if (showPermissionPrompt) {
    return (
      <BottomSheet onClose={() => setShowPermissionPrompt(false)} label="플로팅 가이드 안내">
        <div className="flex flex-col items-center px-1 pb-4 pt-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EFF6FF] text-[#3182F6] shadow-2xs mb-3">
            <Layers size={28} />
          </span>
          <h3 className="text-[18px] font-bold tracking-tight text-[#191F28]">
            화면 위에 가이드를 띄울까요?
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6B7684] max-w-[280px]">
            공식 사이트에서 로그인 및 해지하는 동안, 화면 구석에 단계별 팁이 담긴 <span className="font-semibold text-[#191F28]">미니 버블</span>을 띄워 드려요.
          </p>
          <div className="mt-4 w-full rounded-xl bg-[#F9FAFB] p-3.5 text-left border border-[#E5E8EB]">
            <p className="text-[12px] font-bold text-[#191F28] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#3182F6]" /> '다른 앱 위에 표시' 권한 필요
            </p>
            <p className="mt-1 text-[11px] text-[#8B95A1] leading-relaxed">
              설정 화면으로 이동하여 꾸독 권한을 켜주시면 즉시 플로팅 가이드가 활성화됩니다.
            </p>
          </div>
          <Button size="large" fullWidth className="mt-5" onClick={handleRequestPermission}>
            권한 설정하고 가이드 띄우기
          </Button>
          <button
            type="button"
            onClick={proceedWithoutOverlay}
            className="mt-3.5 text-[12px] font-semibold text-[#6B7684] hover:text-[#191F28] active:scale-95 transition-all"
          >
            권한 없이 일반 브라우저로 이동하기
          </button>
        </div>
      </BottomSheet>
    );
  }

  if (showBrowserModal) {
    return (
      <CancelBrowserModal
        subscription={subscription}
        tutorialOnly={tutorialOnly}
        autoOpened={autoOpen}
        onClose={() => {
          setShowBrowserModal(false);
          if (!tutorialOnly) onToast("해지 화면을 닫았어요. 해지를 완료하셨다면 아래 완료 버튼을 눌러주세요.");
        }}
        onComplete={complete}
      />
    );
  }

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
      <div className="flex items-start gap-3">
        <ServiceMark
          serviceId={subscription.id}
          name={subscription.name}
          monogram={subscription.monogram}
          image={subscription.image || subscription.attachments?.[0]}
          category={subscription.category}
          className="h-12 w-12 rounded-2xl text-[14px] shadow-2xs"
        />
        <div className="min-w-0"><h2 className="truncate text-[20px] font-extrabold tracking-tight text-[#191F28]">{subscription.name} 해지하기</h2><p className="mt-0.5 text-[12px] font-medium text-[#6B7684]">직접 해지 페이지와 단계별 안내를 준비했어요.</p></div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#F2F4F6] p-4">
        <p className="text-[13px] font-bold text-[#191F28]">해지 전 확인할 점</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B7684]">
          결제 중단 시점과 환불 여부는 서비스마다 달라요. 공식 사이트에서 조건을 확인하고 직접 결정해주세요.
        </p>
        {usesNaverPlusCancelEntry(subscription) && (
          <p className="mt-2 text-[12px] leading-relaxed text-[#6B7684]">
            가입 계정으로 로그인하면 네이버 해지 화면으로 이동해요. 다른 화면이 나오면 마이 멤버십 → 설정 → 네이버플러스 멤버십 관리 → 멤버십 해지하기 순서로 찾아가세요.
          </p>
        )}
      </div>

      {providerId && (
        <section className="mt-4 rounded-2xl border border-[#D9E7F8] bg-[#F7FBFF] p-4" aria-label="결제 경로 선택">
          <h3 className="text-[14px] font-bold text-[#191F28]">어디에서 결제하셨나요?</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#4E5968]">영수증에 표시된 결제처를 선택해야 정확한 해지 경로를 열 수 있어요.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["web", "서비스 웹사이트"],
              ["google-play", "Google Play"],
              ["app-store", "App Store"],
              ["unknown", "아직 모르겠어요"],
            ].map(([source, label]) => (
              <button key={source} type="button" aria-pressed={purchaseSource === source}
                onClick={() => {
                  setPurchaseSource(source);
                  setChecked(new Array(getProviderCancellation(rawSub, source)?.guideSteps.length || 0).fill(false));
                  setCancelSessionActive(false);
                }}
                className={`min-h-11 rounded-xl border px-2 py-2 text-[12px] font-semibold ${purchaseSource === source ? "border-[#315976] bg-[#E5F2F9] text-[#254862]" : "border-[#D9E7F8] bg-white text-[#4E5968]"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#4E5968]">{subscription.cancellationNotice}</p>
          <a href={subscription.cancellationHelpUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-[#315976] underline">공식 해지 안내 확인하기 ↗</a>
        </section>
      )}

      {promotion && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#FFD8A8] bg-[#FFF9F2] p-3.5 shadow-2xs">
          <div className="min-w-0 pr-2">
            <span className="inline-block rounded-md bg-[#FFE8CC] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6F0F]">
              관련 혜택 · 조건 확인
            </span>
            <h4 className="mt-1 truncate text-[13px] font-bold text-[#191F28]">{promotion.title}</h4>
            <p className="text-[11px] text-[#8B95A1] truncate">적용 조건을 보고 변경 여부를 판단해주세요</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (promotion.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
            }}
            className="shrink-0 rounded-xl bg-[#FF6F0F] px-3 py-1.5 text-[12px] font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            혜택 보기
          </button>
        </div>
      )}

      {tutorialOnly ? (
        <div className="mt-5 space-y-3">
          <p className="rounded-xl bg-[#F1F6F3] p-3 text-[12px] leading-5 text-[#315976]">이 화면은 해지 경로를 살펴보는 체험입니다. 꾸독에서 실제 해지 완료로 표시하지 않습니다.</p>
          <div data-contest-target="cancel-open-site">
            <Button size="large" fullWidth disabled={!subscription.cancelUrl} onClick={goToCancel} prefixIcon={<ExternalLink size={17} />}>
              {cancelSessionActive ? "해지 안내 다시 열기" : "공식 해지 경로 열기 (가이드 포함)"}
            </Button>
          </div>
        </div>
      ) : cancelSessionActive ? (
        <div className="mt-5 space-y-2">
          <Button
            size="large"
            fullWidth
            className="bg-[#3182F6] hover:bg-[#1B64DA] text-white shadow-md font-bold"
            onClick={complete}
          >
            ✓ 방금 해지를 완료했어요
          </Button>
          <Button
            size="large"
            fullWidth
            variant="secondary"
            onClick={goToCancel}
            prefixIcon={<ExternalLink size={16} />}
          >
            해지 페이지 다시 열기
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <div data-contest-target="cancel-open-site">
            <Button
              size="large"
              fullWidth
              disabled={!subscription.cancelUrl}
              onClick={goToCancel}
              prefixIcon={<ExternalLink size={17} />}
            >
              {subscription.cancelUrl ? providerId && purchaseSource !== "web" ? "결제처의 공식 경로 열기" : "해지 페이지로 바로 이동 (가이드 포함)" : providerId ? "결제처를 먼저 선택해주세요" : "해지 링크를 찾지 못했어요"}
            </Button>
          </div>
          {!tutorialOnly && <Button
            size="large"
            fullWidth
            variant="secondary"
            onClick={complete}
          >
            이미 해지 완료하셨나요? 목록에서 정리
          </Button>}
        </div>
      )}
      {!subscription.cancelUrl && !providerId && <p className="mt-2 text-center text-[12px] font-medium text-[#FF4D4D]">이 서비스의 해지 URL이 DB에 등록되어 있지 않습니다.</p>}

      {subscription.cancelUrl && (!providerId || purchaseSource === "web") && (
        <button
          type="button"
          onClick={openInSystemBrowser}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1 text-[12px] font-semibold text-[#6B7684] hover:text-[#191F28] active:scale-98 transition-all"
        >
          <Globe size={13} className="text-[#8B95A1]" /> 로그인 세션이 유지된 기본 브라우저(Chrome)로 열기
        </button>
      )}

      <section className="mt-5">
        <div className="flex items-center justify-between"><h3 className="text-[15px] font-bold text-[#191F28]">해지 가이드</h3><span className="text-[12px] font-semibold text-[#8B95A1]">Step 1–{steps.length}</span></div>
        <ol className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))}
                className={"flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] " + (checked[index] ? "border-[#191F28] bg-[#F9FAFB] shadow-2xs" : "border-[#E5E8EB] bg-white hover:border-[#D1D6DB]")}
              >
                <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold mt-0.5 " + (checked[index] ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#8B95A1]")}>
                  {checked[index] ? <Check size={14} strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {step.title && (
                    <span className={"block text-[11px] font-bold mb-0.5 " + (checked[index] ? "text-[#191F28]" : "text-[#8B95A1]")}>
                      {step.title}
                    </span>
                  )}
                  <span className={"text-[13px] leading-snug " + (checked[index] ? "font-bold text-[#191F28]" : "font-medium text-[#6B7684]")}>
                    {step.description}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4"><div className="flex gap-2.5"><ShieldCheck className="shrink-0 text-[#6B7684]" size={18} /><p className="text-[12px] leading-relaxed text-[#6B7684]">꾸독은 해지를 대행하지 않아요. 해지 완료 여부는 서비스 화면에서 확인한 뒤 아래 버튼을 눌러주세요.</p></div></div>
      {!tutorialOnly && <Button size="large" fullWidth variant="secondary" className="mt-4" onClick={complete}>해지 완료했습니다</Button>}
    </BottomSheet>
  );
}
