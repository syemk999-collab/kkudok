import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { SplashScreen, LandingScreen } from "./components/LandingScreen";
import { ContestExperienceScreen } from "./contest/ContestExperienceScreen";
import { ContestGuideOverlay } from "./contest/ContestGuideOverlay";
import { ContestPaymentHeadsUp } from "./contest/ContestPaymentHeadsUp";
import { useContestFlow } from "./contest/useContestFlow";
import { AddModal } from "./components/AddModal";
import { AccountModal } from "./components/AccountModal";
import { TermsModal } from "./components/TermsModal";
import { requestPaymentCapturePermission, simulatePaymentDetection } from "./lib/paymentCapture";
import { createContestPaymentEvent, parsePaymentNotification, toQuickAddData } from "./lib/paymentParser";
import { isNativePlatform } from "./lib/platform";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { RenewalSheet } from "./components/RenewalSheet";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, Toast } from "./components/ui";
import { createMockSubscriptions, promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { removeDemoSubscriptions, getStoredUsers, saveUser, findUser, storageKeys, readStoredValue } from "./lib/storage";
import { generateSubscriptionAlerts } from "./lib/notifications";
import { useNavigation } from "./hooks/useNavigation";
import { useSubscriptions, createSubscription } from "./hooks/useSubscriptions";
import { useNotificationManager } from "./hooks/useNotificationManager";
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut, upsertDbSubscription } from "./lib/supabase";

export default function App() {
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialMode, setAddInitialMode] = useState("manual");
  const [quickAddData, setQuickAddData] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState("terms");
  const [toast, setToast] = useState(null);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("kudok_splash_shown");
    }
    return false;
  });

  const notify = useCallback((message, duration = 6000) => {
    setToast({ message, duration, id: Date.now() });
  }, []);

  // 이미 로그인 완료 안내를 받은 유저 ID 추적 (타 웹사이트 왕복, 탭 전환 시 중복 팝업 방지)
  const googleAuthNotifiedUserRef = useRef(
    typeof window !== "undefined"
      ? (readStoredValue(storageKeys.profile, null)?.user_id || sessionStorage.getItem("submate_google_login_notified_user"))
      : null
  );

  // Hash-based navigation
  const {
    screen,
    navigate,
    highlightCancelId,
    setHighlightCancelId,
    hasAppChrome,
    pageTitle,
  } = useNavigation();

  const {
    flow: contestFlow,
    active: contestFlowActive,
    startScenario: startContestScenario,
    setStep: setContestStep,
    reset: resetContestFlow,
  } = useContestFlow();
  const [contestHeadsUp, setContestHeadsUp] = useState(null);

  // Deep link listener (실시간 결제 감지 알림 탭 시 수신)
  useEffect(() => {
    const handleUrl = (event) => {
      const rawUrl = event?.url;
      if (!rawUrl) return;
      try {
        const parsed = new URL(rawUrl);
        if (rawUrl.includes("auth/callback") || rawUrl.includes("access_token=") || rawUrl.includes("code=")) {
          Browser.close().catch(() => {});
          if (rawUrl.includes("code=")) {
            const code = parsed.searchParams.get("code");
            if (code && supabase) {
              supabase.auth.exchangeCodeForSession(code).catch(console.error);
            }
          } else if (rawUrl.includes("#")) {
            const hash = rawUrl.substring(rawUrl.indexOf("#") + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            if (accessToken && refreshToken && supabase) {
              supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(console.error);
            }
          }
          return;
        }

        if (parsed.protocol === "submate:" && (parsed.hostname === "quick-add" || parsed.pathname.includes("quick-add"))) {
          const params = parsed.searchParams;
          const detectedAt = Number(params.get("detectedAt")) || Date.now();
          const detectedDate = new Date(detectedAt);
          const dueDayFromLink = Number(params.get("dueDay"));
          const detectedDueDay =
            dueDayFromLink >= 1 && dueDayFromLink <= 31
              ? dueDayFromLink
              : detectedDate.getDate();

          const detected = {
            name: params.get("name") || "",
            amount: Number(params.get("amount")) || 0,
            plan: params.get("plan") || "",
            paymentMethod: params.get("method") || "",
            category: params.get("category") || "기타",
            serviceId: params.get("serviceId") || "",
            dueDay: detectedDueDay,
            billingCycle: "매월",
            sourceType: "sms",
            autoDetected: true,
          };
          setQuickAddData(detected);
          setAddInitialMode("quick-detect");
          setAddOpen(true);
          if (contestFlow.scenario === "A") {
            setContestStep("A3", { parsedPayment: detected });
          }
        }
      } catch (err) {
        console.warn("Failed to parse deep link URL:", rawUrl, err);
      }
    };

    let sub;
    if (CapApp && typeof CapApp.addListener === "function") {
      sub = CapApp.addListener("appUrlOpen", handleUrl);
      if (typeof CapApp.getLaunchUrl === "function") {
        CapApp.getLaunchUrl().then((launch) => {
          if (launch?.url) handleUrl(launch);
        });
      }
    }

    return () => {
      if (sub && typeof sub.then === "function") {
        sub.then((handle) => handle?.remove?.());
      }
    };
  }, [contestFlow.scenario, setContestStep]);


  const handleOpenTerms = (tab = "terms") => {
    setTermsTab(tab);
    setTermsOpen(true);
  };

  const handleRequestPaymentCapture = async () => {
    if (isNativePlatform()) {
      await requestPaymentCapturePermission();
      notify("시스템 설정에서 꾸독 '알림 접근 허용'을 켜주세요.");
    } else {
      handleOpenTerms("permissions");
      notify("웹 환경입니다. 앱 접근 권한 안내 문서를 표시합니다.");
    }
  };

  const handleTestPaymentDetection = async () => {
    const event = createContestPaymentEvent();

    if (isNativePlatform()) {
      const result = await simulatePaymentDetection({
        package: event.packageName,
        title: event.title,
        body: event.body,
      });

      if (!result?.detected) {
        notify("결제 원문에서 구독 정보를 찾지 못했습니다.");
        return;
      }

      if (contestFlow.scenario === "A") {
        setContestStep("A2", {
          parsedPayment: {
            serviceName: result.serviceName,
            name: result.serviceName,
            serviceId: "netflix",
            amount: Number(result.amount) || 0,
            plan: result.plan || "",
            paymentMethod: result.paymentMethod || "",
            category: "OTT",
            isSubscription: true,
          },
        });
      }

      notify("실제 PaymentParser를 통과한 결제 감지 알림을 발송했습니다.");
      return;
    }

    const parsed = parsePaymentNotification(event);
    if (!parsed) {
      notify("테스트 결제 원문에서 구독 정보를 찾지 못했습니다.");
      return;
    }

    if (contestFlow.scenario === "A") {
      setContestStep("A2", { parsedPayment: parsed });
      setContestHeadsUp(parsed);
      return;
    }

    const quickAdd = toQuickAddData(parsed);
    setQuickAddData(quickAdd);
    setAddInitialMode("quick-detect");
    setAddOpen(true);
    notify("결제 알림 원문을 파싱해 구독 정보를 찾았습니다.");
  };

  const openContestParsedPayment = useCallback(() => {
    const parsed = contestHeadsUp || contestFlow.parsedPayment;
    const quickAdd = toQuickAddData(parsed);
    if (!quickAdd) {
      notify("파싱 결과를 불러오지 못했습니다.");
      return;
    }
    setContestHeadsUp(null);
    setQuickAddData(quickAdd);
    setAddInitialMode("quick-detect");
    setAddOpen(true);
    setContestStep("A3", { parsedPayment: parsed });
  }, [contestFlow.parsedPayment, contestHeadsUp, notify, setContestStep]);


  // Subscriptions domain state
  const {
    profile,
    setProfile,
    subscriptions,
    setSubscriptions,
    setOnboardingComplete,
    selectedOnboarding,
    setSelectedOnboarding,
    cancelTarget,
    cancelSubscription,
    startCancellation,
    closeCancellation,
    finishCancellation,
    renewalTarget,
    setRenewalTarget,
    renewalSubscription,
    handleRenewal,
    getSubscriptionById,
    handleAddSubscription,
    updateSubscription,
    togglePinSubscription,
    muteSubscription,
    deleteSubscription,
  } = useSubscriptions({ currentRoute: screen.route });

  // Notifications domain state
  const {
    notifications,
    setNotifications,
    activeBanner,
    setActiveBanner,
    notificationCenterOpen,
    setNotificationCenterOpen,
    notificationPermission,
    unreadCount,
    handleTriggerTestNotification,
    handleOpenDetailFromNotification,
    handleRequestPermission,
    handleTogglePermissionFromHome,
    markAllRead,
    clearAll,
  } = useNotificationManager({ subscriptions, persist: profile?.provider !== "Contest" });

  
  // Supabase Auth session & state change listener
  useEffect(() => {
    if (!supabase || profile?.provider === "Contest" || contestFlowActive) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const nickname = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "사용자";
        setProfile((prev) => ({
          ...(prev || {}),
          user_id: user.id,
          nickname: prev?.nickname || nickname,
          email: user.email,
          provider: "Google",
          guest: false,
          notificationsAllowed: prev?.notificationsAllowed ?? true,
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;
        const nickname = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "사용자";
        setProfile((prev) => ({
          ...(prev || {}),
          user_id: user.id,
          nickname: prev?.nickname || nickname,
          email: user.email,
          provider: "Google",
          guest: false,
          notificationsAllowed: prev?.notificationsAllowed ?? true,
        }));
        setOnboardingComplete(true);

        // 타 웹사이트 왕복/탭 포커스 복귀 시 중복 팝업 방지 (최초 1회만 알림 표시 및 홈 이동)
        const alreadyNotified =
          googleAuthNotifiedUserRef.current === user.id ||
          (typeof window !== "undefined" && sessionStorage.getItem("submate_google_login_notified_user") === user.id);

        if (!alreadyNotified) {
          googleAuthNotifiedUserRef.current = user.id;
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("submate_google_login_notified_user", user.id);
            } catch (e) {}
          }
          navigate("home");
          notify(`${nickname}님, 구글 계정으로 로그인되었어요!`);
        }
      } else if (event === "SIGNED_OUT") {
        googleAuthNotifiedUserRef.current = null;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("submate_google_login_notified_user");
          } catch (e) {}
        }
        setProfile(null);
        setSubscriptions([]);
        navigate("login");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [contestFlowActive, navigate, notify, profile?.provider, setOnboardingComplete, setProfile, setSubscriptions]);

  // Handle URL query actions (?notifications=1)
  useEffect(() => {
    if (screen.params?.get("notifications") === "1") {
      setNotificationCenterOpen(true);
    }
  }, [screen, setNotificationCenterOpen]);

  // Route guard: unauthenticated users must stay on auth screens
  useEffect(() => {
    if (!profile && !["login", "register", "contest"].includes(screen.route)) {
      navigate("login");
    }
  }, [profile, screen.route, screen.params, navigate]);

  // Hardware back button support for Android (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    CapApp.addListener("backButton", () => {
      if (accountOpen) {
        setAccountOpen(false);
      } else if (notificationCenterOpen) {
        setNotificationCenterOpen(false);
      } else if (addOpen) {
        setAddOpen(false);
      } else if (cancelTarget) {
        closeCancellation();
      } else if (renewalTarget) {
        setRenewalTarget(null);
      } else if (screen.route === "detail") {
        setHighlightCancelId(null);
        navigate("subscriptions");
      } else if (screen.route === "register") {
        navigate("login");
      } else if (screen.route !== "home" && screen.route !== "login") {
        navigate("home");
      } else {
        CapApp.exitApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [
    accountOpen,
    notificationCenterOpen,
    addOpen,
    cancelTarget,
    renewalTarget,
    screen.route,
    closeCancellation,
    navigate,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setRenewalTarget,
  ]);

  const selectedSubscription = useMemo(
    () => getSubscriptionById(screen.id),
    [getSubscriptionById, screen.id]
  );

  
  const handleSocialLogin = async (provider, defaultName) => {
    if (provider === "Google" && isSupabaseConfigured) {
      try {
        notify("구글 로그인 화면으로 이동합니다...");
        const { error } = await signInWithGoogle();
        if (error) throw error;
        return;
      } catch (err) {
        console.error("Google sign in error:", err);
        notify(err.message || "구글 로그인 중 오류가 발생했습니다.");
        return;
      }
    }
    completeLogin(provider, defaultName);
  };

  const handleIdLogin = ({ accountId, password }) => {
    const user = findUser(accountId);
    if (!user) {
      return { error: "존재하지 않는 아이디입니다." };
    }
    if (user.password !== password) {
      return { error: "비밀번호가 일치하지 않습니다." };
    }
    completeLogin("꾸독", user.nickname || accountId);
    notify(`${user.nickname || accountId}님, 환영합니다!`);
    return { success: true };
  };

  const handleRegisterComplete = ({ accountId, password, nickname }) => {
    saveUser({ accountId, password, nickname });
    completeLogin("꾸독", nickname);
    notify(`${nickname}님, 회원가입이 완료되었어요!`);
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    googleAuthNotifiedUserRef.current = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("submate_google_login_notified_user");
      } catch (e) {}
    }
    if (isSupabaseConfigured && profile?.user_id) {
      await signOut();
      notify("로그아웃되었습니다.");
    } else {
      setProfile(null);
      setSubscriptions([]);
      navigate("login");
      notify("로그아웃되었습니다.");
    }
  };

  const handleUpdateNickname = (newNickname) => {
    setProfile((prev) => ({
      ...(prev || {}),
      nickname: newNickname,
    }));
    notify(`${newNickname}으로 닉네임이 변경되었어요!`);
  };

  const completeLogin = (provider, nickname) => {
    setProfile({ nickname: nickname || "사용자", provider, guest: false, notificationsAllowed: true });
    setSubscriptions((current) => removeDemoSubscriptions(current));
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFinish = (customItems) => {
    const itemsToCreate = Array.isArray(customItems) && customItems.length > 0
      ? customItems
      : serviceCatalog.filter((service) => selectedOnboarding.includes(service.id));
    const created = itemsToCreate.map((item, idx) => createSubscription(item, idx));
    setSubscriptions(created);
    if (profile?.user_id) {
      created.forEach((sub) => upsertDbSubscription(profile.user_id, sub));
    }
    setOnboardingComplete(true);
    setNotifications(generateSubscriptionAlerts(created));
    navigate("home");
    notify(`${created.length}개 구독을 추가했어요.`);
  };

  const handleOnboardingSkip = () => {
    setSubscriptions([]);
    setOnboardingComplete(true);
    navigate("home");
  };

  const handlePromotion = useCallback((promotion) => {
    if (contestFlow.step === "A6") {
      setContestStep("A7");
    }

    if (promotion?.link) {
      if (isNativePlatform()) {
        Browser.open({ url: promotion.link }).catch(() => {
          window.open(promotion.link, "_blank", "noopener,noreferrer");
        });
      } else {
        window.open(promotion.link, "_blank", "noopener,noreferrer");
      }
      notify("공식 혜택 출처를 열었어요.");
    } else {
      navigate("promotions");
    }
  }, [contestFlow.step, navigate, notify, setContestStep]);

  const resetContestExperience = useCallback(() => {
    setContestHeadsUp(null);
    setQuickAddData(null);
    setAddOpen(false);
    closeCancellation();
    setNotificationCenterOpen(false);
    setHighlightCancelId(null);
    setSubscriptions(
      createMockSubscriptions().filter((subscription) =>
        (subscription.serviceId || subscription.id) !== "netflix"
      )
    );
    resetContestFlow();
    navigate("contest");
  }, [
    closeCancellation,
    navigate,
    resetContestFlow,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setSubscriptions,
  ]);

  const navigateFromContest = useCallback((targetRoute) => {
    if (contestFlow.step === "A5" && targetRoute === "promotions") {
      setContestStep("A6");
    } else if (contestFlow.step === "B6" && targetRoute === "subscriptions") {
      setContestStep("B7");
    }
    setHighlightCancelId(null);
    navigate(targetRoute);
  }, [contestFlow.step, navigate, setContestStep, setHighlightCancelId]);

  const openNotificationCenter = useCallback(() => {
    if (contestFlow.step === "A7") {
      setContestStep("A8");
    }
    setNotificationCenterOpen(true);
  }, [contestFlow.step, setContestStep, setNotificationCenterOpen]);

  const triggerContestReminder = useCallback(() => {
    handleTriggerTestNotification(null, notify);
    if (contestFlow.step === "A8") {
      setContestStep("A9");
    }
  }, [contestFlow.step, handleTriggerTestNotification, notify, setContestStep]);

  let content;
  if (screen.route === "landing") {
    content = (
      <LandingScreen
        onStart={() => navigate("home")}
        onLogin={() => navigate("login")}
      />
    );
  } else if (screen.route === "contest") {
    content = (
      <ContestExperienceScreen
        flow={contestFlow}
        onStartScenario={startContestScenario}
        onRunPayment={handleTestPaymentDetection}
        onSampleReady={() => setContestStep("B2")}
        onOpenImageRegistration={() => {
          setAddInitialMode("ai");
          setQuickAddData(null);
          setAddOpen(true);
          setContestStep("B3");
        }}
        onReset={resetContestExperience}
      />
    );
  } else if (screen.route === "register") {
    content = (
      <AuthRegister
        onBack={() => navigate("login")}
        onComplete={handleRegisterComplete}
        existingUsers={getStoredUsers()}
      />
    );
  } else if (screen.route === "onboarding") {
    content = <OnboardingScreen catalog={serviceCatalog} selectedIds={selectedOnboarding} onToggle={(id) => setSelectedOnboarding((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onFinish={handleOnboardingFinish} onSkip={handleOnboardingSkip} />;
  } else if (screen.route === "home") {
    content = (
      <HomeScreen
        subscriptions={subscriptions}
        promotions={promotionCatalog}
        profile={profile}
        notificationDenied={profile?.notificationsAllowed === false}
        onOpenSubscription={(id) => navigate("detail", id)}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onScan={() => { setAddInitialMode("ai"); setAddOpen(true); }}
        onStartOnboarding={() => navigate("onboarding")}
        onToggleNotificationPermission={() =>
          handleTogglePermissionFromHome(
            profile,
            (allowed) => setProfile((p) => ({ ...(p || {}), notificationsAllowed: allowed })),
            notify
          )
        }
        onOpenNotificationCenter={() => setNotificationCenterOpen(true)}
        onTestPaymentDetection={handleTestPaymentDetection}
        onRequestPaymentCapture={handleRequestPaymentCapture}
        onOpenTerms={handleOpenTerms}
        onLogout={handleLogout}
        onOpenAccount={() => setAccountOpen(true)}
        onTogglePin={(id) => togglePinSubscription(id, notify)}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = (
      <SubscriptionListScreen
        subscriptions={subscriptions}
        onOpen={(id) => navigate("detail", id)}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onStartCancel={(id, promotion, options) => {
          startCancellation(id, promotion, options);
          if (contestFlow.step === "B8") {
            setContestStep("B9");
          }
        }}
        onMute={(id) => muteSubscription(id, notify)}
        onRefresh={() => notify("최신 구독 목록을 확인했어요.")}
        onTogglePin={(id) => togglePinSubscription(id, notify)}
      />
    );
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={(id) => navigate("detail", id)} />;
  } else if (screen.route === "promotions") {
    content = (
      <PromotionScreen
        subscriptions={subscriptions}
        promotions={promotionCatalog}
        onOpenPromotion={handlePromotion}
        contestMode={contestFlow.scenario === "A"}
      />
    );
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        subscription={selectedSubscription}
        subscriptions={subscriptions}
        onUpdate={(id, update) => updateSubscription(id, update, notify)}
        onStartCancel={startCancellation}
        onBack={() => {
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        onDelete={(id) => {
          deleteSubscription(id);
          notify("구독이 삭제되었습니다.");
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        promotion={promotionCatalog.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        onTriggerNotification={(sub) => handleTriggerTestNotification(sub, notify)}
        highlightCancel={highlightCancelId === selectedSubscription?.subscriptionId}
        contestMode={contestFlow.scenario === "B"}
      />
    );
  } else {
    content = (
      <AuthLogin
        onSocial={handleSocialLogin}
        onLogin={handleIdLogin}
        onRegister={() => navigate("register")}
      />
    );
  }

  return (
    <div className="app-shell" data-screen={screen.route} data-hash={typeof window !== "undefined" ? window.location.hash : ""}>
      {showSplash && screen.route !== "contest" && (
        <SplashScreen
          onFinish={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("kudok_splash_shown", "1");
            }
            setShowSplash(false);
          }}
        />
      )}
      {hasAppChrome && screen.route !== "home" && screen.route !== "detail" && (
        <AppHeader
          title={pageTitle}
          onBack={screen.route === "detail" ? () => {
            setHighlightCancelId(null);
            navigate("subscriptions");
          } : undefined}
          rightSlot={
            <button
              type="button"
              data-contest-target="notification-center-button"
              onClick={openNotificationCenter}
              className="relative grid h-9 w-9 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black transition-colors"
              aria-label="알림 센터 열기"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </button>
          }
        />
      )}
      {content}
      {hasAppChrome && screen.route !== "detail" && (
        <BottomNavigation
          route={screen.route}
          onNavigate={navigateFromContest}
          onOpenAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
          onOpenNotifications={() => setNotificationCenterOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
        />
      )}
      {addOpen && (
        <AddModal
          catalog={serviceCatalog}
          subscriptions={subscriptions}
          initialMode={addInitialMode}
          initialData={quickAddData}
          onClose={() => {
            setAddOpen(false);
            setQuickAddData(null);
          }}
          onRecognitionStart={() => {
            if (contestFlow.scenario === "B") {
              setContestStep("B3");
            }
          }}
          onRecognitionComplete={({ recognized }) => {
            if (contestFlow.scenario === "B") {
              setContestStep("B4", { ocrResult: recognized });
            }
          }}
          onRecognitionError={(error) => {
            if (contestFlow.scenario === "B") {
              notify(error?.message || "AI 인식에 실패했습니다. 같은 이미지를 다시 선택해주세요.");
            }
          }}
          onAdd={(data) => {
            const created = handleAddSubscription(data, notify);
            setQuickAddData(null);
            if (!created) return false;

            if (contestFlow.scenario === "A" && ["A3", "A4"].includes(contestFlow.step)) {
              setContestStep("A5", { addedSubscriptionId: created.subscriptionId });
              navigate("home");
            } else if (contestFlow.scenario === "B" && ["B4", "B5"].includes(contestFlow.step)) {
              setContestStep("B6", { addedSubscriptionId: created.subscriptionId });
              navigate("home");
            }
            return created;
          }}
        />
      )}
      {cancelSubscription && (
        <CancelModal
          subscription={cancelSubscription}
          promotion={cancelTarget?.promotion}
          autoOpen={cancelTarget?.autoOpen}
          onClose={closeCancellation}
          onComplete={(id, saved) => finishCancellation(id, saved, () => {
            if (screen.route === "detail") navigate("subscriptions");
          })}
          onToast={notify}
          onExternalOpen={() => {
            if (contestFlow.step === "B9") {
              setContestStep("B10");
            }
          }}
        />
      )}
      {renewalSubscription && !addOpen && !cancelSubscription && !notificationCenterOpen && !termsOpen && (
        <RenewalSheet
          subscription={renewalSubscription}
          onKeep={() => handleRenewal(true, notify)}
          onCancel={() => handleRenewal(false, notify)}
          onClose={() => setRenewalTarget(null)}
        />
      )}
      {notificationCenterOpen && (
        <NotificationCenterModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotificationCenterOpen(false)}
          onOpenDetail={(subId) => handleOpenDetailFromNotification(subId, (id) => {
            setHighlightCancelId(id);
            navigate("detail", id);
          })}
          onMarkAllRead={markAllRead}
          onClearAll={clearAll}
          onTriggerTest={triggerContestReminder}
          notificationPermission={notificationPermission}
          onRequestPermission={() =>
            handleRequestPermission(
              (allowed) => setProfile((p) => ({ ...(p || {}), notificationsAllowed: allowed })),
              notify
            )
          }
          onTestPaymentDetection={handleTestPaymentDetection}
          onRequestPaymentCapture={handleRequestPaymentCapture}
          onOpenTerms={handleOpenTerms}
        />
      )}
      {termsOpen && (
        <TermsModal
          initialTab={termsTab}
          onClose={() => setTermsOpen(false)}
        />
      )}
      {accountOpen && (
        <AccountModal
          profile={profile}
          onClose={() => setAccountOpen(false)}
          onUpdateNickname={handleUpdateNickname}
          onTestPaymentDetection={handleTestPaymentDetection}
          onRequestPaymentCapture={handleRequestPaymentCapture}
          onLogout={handleLogout}
        />
      )}
      {contestHeadsUp && (
        <ContestPaymentHeadsUp
          payment={contestHeadsUp}
          onOpen={openContestParsedPayment}
          onDismiss={() => setContestHeadsUp(null)}
        />
      )}
      {contestFlowActive && (
        <ContestGuideOverlay
          flow={contestFlow}
          onStep={setContestStep}
          onExit={resetContestExperience}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
