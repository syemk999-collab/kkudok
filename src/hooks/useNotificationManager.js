import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createMockSubscriptions } from "../data/subscriptionData";
import {
  generateSubscriptionAlerts,
  createTestNotification,
  getStoredNotifications,
  saveStoredNotifications,
  requestNotificationPermission,
  initAndroidNotificationChannel,
  sendAppNotification,
  scheduleSubscriptionNotifications,
} from "../lib/notifications";
import { readHash } from "./useNavigation";

export function useNotificationManager({ subscriptions = [], persist = true } = {}) {
  const previousPersist = useRef(persist);
  const savedNotifications = useRef(null);
  const pendingRestoration = useRef(false);
  const [notifications, setNotifications] = useState(() => {
    const stored = persist ? getStoredNotifications() : [];
    if (stored.length > 0) return stored;
    return subscriptions.length > 0 ? generateSubscriptionAlerts(subscriptions) : [];
  });

  useEffect(() => {
    if (previousPersist.current === persist) return;
    if (!persist) {
      savedNotifications.current = notifications;
      setNotifications([]);
    } else {
      pendingRestoration.current = true;
      setNotifications(savedNotifications.current ?? getStoredNotifications());
      savedNotifications.current = null;
    }
    previousPersist.current = persist;
  }, [persist]);

  const [notificationCenterOpen, setNotificationCenterOpen] = useState(() => {
    const initial = readHash();
    return initial.params?.get("notifications") === "1";
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  // Persist notifications
  useEffect(() => {
    initAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    if (!persist) return;
    if (pendingRestoration.current) {
      pendingRestoration.current = false;
      return;
    }
    if (notifications.length > 0) {
      saveStoredNotifications(notifications);
    }
  }, [notifications, persist]);

  // Auto-generate alerts when subscriptions update
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;
    const generated = generateSubscriptionAlerts(subscriptions);
    if (generated.length > 0) {
      setNotifications((current) => {
        const existingIds = new Set(current.map((n) => n.id));
        const newItems = generated.filter((n) => !existingIds.has(n.id));
        if (newItems.length === 0) return current;
        return [...newItems, ...current];
      });
    }
    if (persist) {
      scheduleSubscriptionNotifications(subscriptions).catch(() => {});
    }
  }, [subscriptions, persist]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleTriggerTestNotification = useCallback((targetSub = null, notify = null, forcedType = "auto") => {
    const sub = targetSub || subscriptions.find((s) => s.id === "spotify") || subscriptions.find((s) => s.id === "netflix") || subscriptions[0];
    if (!sub) {
      notify?.("등록된 구독이 없어 알림을 생성할 수 없습니다.");
      return null;
    }
    const alertItem = createTestNotification(sub, forcedType);
    setNotifications((current) => [alertItem, ...current]);
    sendAppNotification(alertItem.title, { body: alertItem.message });
    notify?.(`${alertItem.badge} 푸시 알림을 발송했어요.`);
    return alertItem;
  }, [subscriptions]);

  const handleOpenDetailFromNotification = useCallback((subId, onNavigate) => {
    setNotifications((current) =>
      current.map((n) => (n.subscriptionId === subId ? { ...n, read: true } : n))
    );
    setNotificationCenterOpen(false);
    onNavigate?.(subId);
  }, []);

  const handleRequestPermission = useCallback(async (onProfileUpdate = null, notify = null) => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      onProfileUpdate?.(true);
      notify?.("브라우저 알림 권한이 허용되었습니다.");
    } else {
      onProfileUpdate?.(false);
      notify?.("알림 권한이 거부되었습니다.");
    }
  }, []);

  const handleTogglePermissionFromHome = useCallback(async (profile, onProfileUpdate = null, notify = null) => {
    if (profile?.notificationsAllowed === false) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      onProfileUpdate?.(true);
      notify?.("결제 사전 알림이 켜졌어요.");
    } else {
      onProfileUpdate?.(false);
      notify?.("결제 사전 알림을 껐어요.");
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((curr) => curr.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    activeBanner: null,
    setActiveBanner: () => {},
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
  };
}
