import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { NotificationType, AppNotification } from '../store/useStore';

const NOTIF_CONFIG: Record<NotificationType, { icon: string; gradient: string; label: string; borderGlow: string }> = {
  xp: { icon: '⚡', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', label: 'XP Earned', borderGlow: 'rgba(168,85,247,0.45)' },
  level: { icon: '🎉', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', label: 'Level Up!', borderGlow: 'rgba(245,158,11,0.5)' },
  badge: { icon: '🏆', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', label: 'Badge Unlocked', borderGlow: 'rgba(16,185,129,0.5)' },
  challenge: { icon: '🎯', gradient: 'linear-gradient(135deg, #ec4899, #a855f7)', label: 'Milestone Reached', borderGlow: 'rgba(236,72,153,0.5)' },
  achievement: { icon: '🌟', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', label: 'Achievement Unlocked', borderGlow: 'rgba(6,182,212,0.5)' },
  goal: { icon: '✓', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', label: 'Goal Complete', borderGlow: 'rgba(16,185,129,0.4)' },
  success: { icon: '✅', gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'Success', borderGlow: 'rgba(16,185,129,0.4)' },
  error: { icon: '⚠️', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Error', borderGlow: 'rgba(239,68,68,0.4)' },
  info: { icon: 'ℹ️', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', label: 'Information', borderGlow: 'rgba(59,130,246,0.4)' },
};

const AUTO_DISMISS_MS = 4000;
const MAX_VISIBLE = 2; // Queue holds the rest, showing at most 2 at a time

export default function AchievementNotification() {
  const storeNotifications = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);

  const [activeList, setActiveList] = useState<AppNotification[]>([]);
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  // Listen to store notifications and route to local queue
  useEffect(() => {
    const newItems = storeNotifications.filter(n => !processedIds.current.has(n.id));
    if (newItems.length > 0) {
      newItems.forEach(n => processedIds.current.add(n.id));
      setQueue(prev => [...prev, ...newItems]);
    }
  }, [storeNotifications]);

  // Process queue and move to active list
  useEffect(() => {
    if (activeList.length < MAX_VISIBLE && queue.length > 0) {
      const nextNotif = queue[0];
      setQueue(prev => prev.slice(1));
      setActiveList(prev => [...prev, nextNotif]);
    }
  }, [activeList, queue]);

  const handleDismiss = (id: string) => {
    setActiveList(prev => prev.filter(n => n.id !== id));
    dismissNotification(id);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {activeList.map((notif) => (
        <NotificationToast
          key={notif.id}
          id={notif.id}
          type={notif.type}
          title={notif.title}
          message={notif.message}
          xp={notif.xp}
          onDismiss={handleDismiss}
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
      style={{
        pointerEvents: 'auto',
        background: 'linear-gradient(135deg, rgba(10, 10, 24, 0.95) 0%, rgba(20, 15, 40, 0.92) 100%)',
        border: `1px solid ${config.borderGlow}`,
        boxShadow: `0 12px 40px rgba(0, 0, 0, 0.6), 0 0 25px ${config.borderGlow}`,
        minWidth: 320,
        borderRadius: 18,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
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
          height: 3,
          overflow: 'hidden',
          borderRadius: '0 0 18px 18px',
        }}
      >
        <div
          className="achievement-progress-bar"
          style={{
            height: '100%',
            background: config.gradient,
            opacity: 0.6,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 0' }}>
        {/* Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: config.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
            boxShadow: `0 4px 15px ${config.borderGlow}`,
          }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: type === 'xp' ? '#c084fc' : type === 'level' ? '#fbbf24' : type === 'badge' ? '#34d399' : type === 'challenge' ? '#f472b6' : '#22d3ee',
              marginBottom: 3,
            }}
          >
            {config.label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#f8fafc',
              fontFamily: 'Space Grotesk, sans-serif',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {message && (
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                marginTop: 2,
                lineHeight: 1.3,
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
              background: 'rgba(168,85,247,0.18)',
              border: '1px solid rgba(168,85,247,0.4)',
              fontSize: 12,
              fontWeight: 800,
              color: '#c084fc',
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
