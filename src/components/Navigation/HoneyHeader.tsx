"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Header,
  HeaderName,
  HeaderNavigation,
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
import { authApi } from "@/lib/api";
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

// Static mock notifications defined outside the component so they are never rebuilt
const ROLE_NOTIFICATIONS: Record<string, NotificationItem[]> = {
  farmer: [
    {
      id: "f1",
      title: "Blockchain Verified",
      description:
        "Your recent harvest (BATCH-001) has been verified by the Regional Hub.",
      time: "2m ago",
      type: "blockchain",
      read: false,
    },
    {
      id: "f2",
      title: "Weather Warning",
      description:
        "High humidity forecasted for Siwan region. Monitor storage conditions.",
      time: "1h ago",
      type: "warning",
      read: false,
    },
    {
      id: "f3",
      title: "MSP Update",
      description:
        "Minimum Support Price for Grade A Mustard Honey has increased by 5%.",
      time: "4h ago",
      type: "success",
      read: true,
    },
  ],
  warehouse: [
    {
      id: "w1",
      title: "Temperature Breach",
      description: "Sensor R13 detected 24.5°C. Cooling system check required.",
      time: "5m ago",
      type: "error",
      read: false,
    },
    {
      id: "w2",
      title: "Incoming Batch",
      description: "Batch B-992 from Dindori Forest is expected in 30 mins.",
      time: "20m ago",
      type: "info",
      read: false,
    },
  ],
  lab: [
    {
      id: "l1",
      title: "New Sample Arrival",
      description:
        "Sample B-101 received from Siwan Cluster. Awaiting analysis.",
      time: "10m ago",
      type: "info",
      read: false,
    },
    {
      id: "l2",
      title: "Calibration Due",
      description: "Spectrophotometer #04 requires weekly calibration.",
      time: "2h ago",
      type: "warning",
      read: false,
    },
  ],
  officer: [
    {
      id: "o1",
      title: "Audit Queue Update",
      description:
        "3 new batches from Madhu Godown are ready for state certification.",
      time: "15m ago",
      type: "info",
      read: false,
    },
    {
      id: "o2",
      title: "Mismatch Detected",
      description:
        "Batch CERT-772 weight mismatch found in digital cross-check.",
      time: "1h ago",
      type: "error",
      read: false,
    },
  ],
  enterprise: [
    {
      id: "e1",
      title: "Contract Signed",
      description:
        "Bulk contract with Northern Valley Farm has been immutably signed.",
      time: "3m ago",
      type: "success",
      read: false,
    },
    {
      id: "e2",
      title: "Sourcing Alert",
      description: "Unlocking new sourcing route through Siwan FPO.",
      time: "1d ago",
      type: "info",
      read: true,
    },
  ],
  consumer: [
    {
      id: "c1",
      title: "Traceability Success",
      description:
        "Your bottle of honey was harvested by Ramesh Kumar on March 10.",
      time: "Now",
      type: "blockchain",
      read: false,
    },
    {
      id: "c2",
      title: "Safety Verified",
      description:
        "Pollen analysis confirms 100% natural origin for your batch.",
      time: "1h ago",
      type: "success",
      read: false,
    },
  ],
  secretary: [
    {
      id: "s1",
      title: "Network Health Report",
      description: "100% integrity across 1,024 regional nodes maintained.",
      time: "6h ago",
      type: "success",
      read: false,
    },
    {
      id: "s2",
      title: "Node Offline",
      description: "Regional Node #229 (Bihar South) is currently syncing.",
      time: "2m ago",
      type: "warning",
      read: false,
    },
  ],
};

const HoneyHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const ti = useTranslations("Index");
  const tCommon = useTranslations("common");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const currentRole = useMemo(
    () =>
      roles.find((r) => pathname.includes(`/dashboard/${r.id}`)) || roles[0],
    [pathname],
  );

  // Load role-specific notifications only when the role changes
  useEffect(() => {
    setNotifications([]);
  }, [currentRole.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const clearAll = () => setNotifications([]);

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

  // Don't render header on Login / Entry Portal
  if (pathname === "/en" || pathname === "/hi" || pathname === "/") {
    return null;
  }

  return (
    <>
      <HeaderContainer
        render={(props: { isSideNavExpanded: boolean; onClickSideNavExpand: () => void }) => {
          const { isSideNavExpanded, onClickSideNavExpand } = props;
          return (
            <Header aria-label={ti('title')}>
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
              onCloseAction={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAsReadAction={markAsRead}
              onClearAllAction={clearAll}
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

      {/* Logout confirmation dialog */}
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
