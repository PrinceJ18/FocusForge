import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { NotificationType } from '../store/useStore';

const NOTIF_CONFIG: Record<NotificationType, { icon: string; gradient: string; label: string }> = {
  xp: { icon: '⚡', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', label: 'XP Earned' },
  level: { icon: '🎉', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', label: 'Level Up!' },
  badge: { icon: '🏆', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', label: 'Badge Unlocked' },
  challenge: { icon: '🎯', gradient: 'linear-gradient(135deg, #ec4899, #a855f7)', label: 'Challenge Complete' },
  achievement: { icon: '🌟', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', label: 'Achievement' },
};

const AUTO_DISMISS_MS = 4000;
const MAX_VISIBLE = 3;

export default function AchievementNotification() {
  const notifications = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);

  const visibleNotifications = notifications.slice(-MAX_VISIBLE);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {visibleNotifications.map((notif) => (
        <NotificationToast
          key={notif.id}
          id={notif.id}
          type={notif.type}
          title={notif.title}
          message={notif.message}
          xp={notif.xp}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}

function NotificationToast({
  id,
  type,
  title,
  message,
  xp,
  onDismiss,
}: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  xp?: number;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = NOTIF_CONFIG[type];

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, onDismiss]);

  return (
    <div
      className="achievement-notification"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Accent gradient bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: config.gradient,
          borderRadius: '18px 18px 0 0',
        }}
      />

      {/* Progress bar (auto-dismiss indicator) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          overflow: 'hidden',
          borderRadius: '0 0 18px 18px',
        }}
      >
        <div
          className="achievement-progress-bar"
          style={{
            height: '100%',
            background: config.gradient,
            opacity: 0.5,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: config.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
            boxShadow: `0 0 20px ${type === 'xp' ? 'rgba(168,85,247,0.4)' : type === 'level' ? 'rgba(245,158,11,0.4)' : type === 'badge' ? 'rgba(16,185,129,0.4)' : type === 'challenge' ? 'rgba(236,72,153,0.4)' : 'rgba(6,182,212,0.4)'}`,
          }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: type === 'xp' ? '#a855f7' : type === 'level' ? '#f59e0b' : type === 'badge' ? '#10b981' : type === 'challenge' ? '#ec4899' : '#06b6d4',
              marginBottom: 2,
            }}
          >
            {config.label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#f1f0ff',
              fontFamily: 'Space Grotesk, sans-serif',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {message && (
            <div
              style={{
                fontSize: 12,
                color: '#9d9db4',
                marginTop: 2,
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* XP badge */}
        {xp != null && xp > 0 && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)',
              fontSize: 13,
              fontWeight: 700,
              color: '#a855f7',
              fontFamily: 'Space Grotesk, sans-serif',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            +{xp} XP
          </div>
        )}
      </div>
    </div>
  );
}
