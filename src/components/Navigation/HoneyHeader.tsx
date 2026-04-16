"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  SideNavLink,
  HeaderContainer,
} from "@carbon/react";
import {
  Notification,
  NotificationNew,
  Logout,
} from "@carbon/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authApi, notificationsApi, type NotificationItem as ApiNotificationItem } from "@/lib/api";
import NotificationCenter, {
  NotificationItem,
} from "../Notifications/NotificationCenter";

const roles = [
  { id: "farmer" },
  { id: "warehouse" },
  { id: "lab" },
  { id: "officer" },
  { id: "enterprise" },
  { id: "consumer" },
  { id: "secretary" },
];

const POLL_INTERVAL_MS = 15000;

type HeaderNotificationItem = NotificationItem & {
  batchId: string | null;
};

function toRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapApiNotification(item: ApiNotificationItem): HeaderNotificationItem {
  const batchSuffix = item.batchId ? ` (${item.batchId})` : "";
  return {
    id: item.id,
    title: item.title,
    description: `${item.message}${batchSuffix}`,
    time: toRelativeTime(item.createdAt),
    type: "info",
    read: item.isRead,
    batchId: item.batchId,
  };
}

const HoneyHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const ti = useTranslations("Index");
  const tCommon = useTranslations("common");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasLoadedNotifications = useRef(false);

  const currentRole = useMemo(
    () =>
      roles.find((r) => pathname.includes(`/dashboard/${r.id}`)) || roles[0],
    [pathname],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled && !hasLoadedNotifications.current) setIsNotificationsLoading(true);
        const data = await notificationsApi.list();
        if (!cancelled) {
          setNotifications(data.notifications.map(mapApiNotification));
          setUnreadCount(data.unreadCount);
          hasLoadedNotifications.current = true;
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) setIsNotificationsLoading(false);
      }
    };

    load();
    const pollId = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [currentRole.id]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      // Keep UI optimistic even if API call fails.
    }
  };

  const clearAll = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      // Keep UI optimistic even if API call fails.
    }
  };

  const handleOpenNotification = (id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (!item?.batchId) return;
    const locale = pathname.split("/")[1] || "en";
    setIsNotificationsOpen(false);
    router.push(`/${locale}/trace/${item.batchId}`);
  };

  const handleLogout = () => setIsLogoutConfirmOpen(true);
  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    try {
      await authApi.logout();
    } catch {
      // continue navigation even if logout request fails
    }
    router.push("/");
  };

  if (pathname === "/en" || pathname === "/hi" || pathname === "/") {
    return null;
  }

  return (
    <>
      <HeaderContainer
        render={(props: { isSideNavExpanded: boolean; onClickSideNavExpand: () => void }) => {
          const { isSideNavExpanded, onClickSideNavExpand } = props;
          return (
            <Header aria-label={ti("title")}>
              <HeaderMenuButton
                aria-label="Open menu"
                onClick={onClickSideNavExpand}
                isActive={isSideNavExpanded}
              />
              <HeaderName href="/" prefix="">
                {ti("title")}
              </HeaderName>

              <HeaderGlobalBar>
                <HeaderGlobalAction
                  aria-label={tCommon("notifications")}
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative"
                >
                  {unreadCount > 0 ? (
                    <NotificationNew size={20} />
                  ) : (
                    <Notification size={20} />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-[var(--cds-header-bg)]" />
                  )}
                </HeaderGlobalAction>

                <HeaderGlobalAction
                  aria-label={tCommon("logout")}
                  onClick={handleLogout}
                  tooltipAlignment="end"
                >
                  <Logout size={20} />
                </HeaderGlobalAction>
              </HeaderGlobalBar>

              <NotificationCenter
                isOpen={isNotificationsOpen}
                isLoading={isNotificationsLoading}
                onCloseAction={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAsReadAction={(id) => { void markAsRead(id); }}
                onClearAllAction={() => { void clearAll(); }}
                onOpenNotificationAction={handleOpenNotification}
              />

              <SideNav
                aria-label="Side navigation"
                expanded={isSideNavExpanded}
                isPersistent={false}
              >
                <SideNavItems>
                  <SideNavLink
                    href={`/${pathname.split("/")[1]}/dashboard/${currentRole.id}`}
                  >
                    Dashboard
                  </SideNavLink>
                </SideNavItems>
              </SideNav>
            </Header>
          );
        }}
      />

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsLogoutConfirmOpen(false)}
            aria-hidden="true"
          />
          <div className="logout-dialog">
            <div className="logout-dialog-icon">
              <Logout size={22} />
            </div>
            <h2 className="logout-dialog-title">Sign out of HoneyTRACE?</h2>
            <p className="logout-dialog-desc">
              Any unsaved changes will be lost. You will need to sign in again to continue.
            </p>
            <div className="logout-dialog-actions">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="logout-btn logout-btn--cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="logout-btn logout-btn--confirm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HoneyHeader;
