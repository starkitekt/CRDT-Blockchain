'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile,
  Stack,
  Button,
  Tag
} from '@carbon/react';
import {
  Close,
  Notification,
  Information,
  WarningAlt,
  CheckmarkFilled,
  Time
} from '@carbon/icons-react';

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'blockchain';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  read: boolean;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onCloseAction: () => void;
  notifications: NotificationItem[];
  onMarkAsReadAction: (id: string) => void;
  onClearAllAction: () => void;
}

export default function NotificationCenter({
  isOpen,
  onCloseAction,
  notifications,
  onMarkAsReadAction,
  onClearAllAction
}: NotificationCenterProps) {
  const tc = useTranslations('common');

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'warning': return <WarningAlt size={20} className="text-warning" />;
      case 'success': return <CheckmarkFilled size={20} className="text-success" />;
      case 'error': return <WarningAlt size={20} className="text-error" />;
      case 'blockchain': return <Notification size={20} className="text-primary" />;
      default: return <Information size={20} className="text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    // Keep in DOM for slide-out transition — translate instead of unmount
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-surface shadow-2xl z-[2000] border-l border-border-subtle
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-spacing-md border-b border-border-subtle flex justify-between items-center bg-background">
          <div className="flex items-center gap-spacing-xs">
            <Notification size={20} className="text-primary" />
            <h2 className="text-h2 !text-lg">{tc('notifications')}</h2>
            {unreadCount > 0 && (
              <Tag type="blue" size="sm" className="ml-2">
                {tc('notifications_new', { count: unreadCount })}
              </Tag>
            )}
          </div>
          <Button
            hasIconOnly
            renderIcon={Close}
            iconDescription={tc('close')}
            kind="ghost"
            size="md"
            onClick={onCloseAction}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-spacing-md bg-background/30">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale">
              <Notification size={48} className="mb-spacing-md" />
              <p className="text-body">{tc('all_caught_up')}</p>
            </div>
          ) : (
            <Stack gap={4}>
              {notifications.map((notif) => (
                <Tile
                  key={notif.id}
                  className={`relative p-spacing-md transition-all cursor-pointer border
                    ${notif.read
                      ? 'bg-surface opacity-60 border-border-subtle'
                      : 'bg-background border-primary shadow-sm'
                    }`}
                  onClick={() => onMarkAsReadAction(notif.id)}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
                  )}
                  <div className="flex gap-spacing-md">
                    <div className="mt-1 shrink-0">
                      {getTypeIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h4 className={`text-sm font-bold leading-tight ${notif.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-text-secondary flex items-center gap-1 font-mono shrink-0">
                          <Time size={10} /> {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-tight">
                        {notif.description}
                      </p>
                    </div>
                  </div>
                </Tile>
              ))}
            </Stack>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-spacing-md border-t border-border-subtle bg-background">
            <Button
              kind="ghost"
              className="w-full text-primary hover:bg-primary/10"
              onClick={onClearAllAction}
            >
              {tc('clear_all_notifications')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
