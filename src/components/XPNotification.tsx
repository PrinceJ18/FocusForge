import { useEffect } from 'react';

interface XPNotificationProps {
  show: boolean;
  title: string;
  xp: number;
  onClose: () => void;
}

export default function XPNotification({
  show,
  title,
  xp,
  onClose,
}: XPNotificationProps) {
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[9999] animate-slide-up"
      style={{
        minWidth: 280,
        padding: 16,
        borderRadius: 18,
        background: 'rgba(20,20,30,0.95)',
        border: '1px solid rgba(168,85,247,0.35)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 0 30px rgba(168,85,247,0.25)',
      }}
    >
      <div className="text-lg font-bold mb-1">
        🎉 XP Earned
      </div>

      <div
        className="text-sm mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        {title}
      </div>

      <div
        className="text-2xl font-bold"
        style={{ color: '#a855f7' }}
      >
        +{xp} XP
      </div>
    </div>
  );
}