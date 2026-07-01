import React from 'react';
import { LayoutDashboard, Wallet, Timer, BarChart3, Trophy, Users, Zap, X } from 'lucide-react';
import { useStore, type Page } from '../store/useStore';
import { getLevelInfo } from "../lib/levels";
import { formatCurrency } from '../lib/formatCurrency';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: Array<{ id: string; label: string; icon: React.ReactNode; badge?: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'finance', label: 'Finance', icon: <Wallet size={18} /> },
  { id: 'productivity', label: 'Focus', icon: <Timer size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'splits', label: 'Expense Buddy', icon: <Users size={18} /> },
  { id: 'rewards', label: 'Rewards', icon: <Trophy size={18} /> },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentPage, setPage, profile, user } = useStore();
  const levelInfo = getLevelInfo(profile.xp);

  const xpLevel = levelInfo.level;
  const xpProgress = levelInfo.progress;

  const handleNav = (page: Page) => {
    setPage(page);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ zIndex: 101, width: 'min(82vw, 280px)', height: '100vh', overflow: 'hidden', }} >
        {/* Logo */}
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
                FocusForge
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Focus Finance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* User profile preview */}
        {user && (
          <div className="mx-4 mb-4 p-3 rounded-14" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12 }}>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white' }}
              >
                {(profile.display_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile.display_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Level {xpLevel}</p>
              </div>
              <div className="text-xs font-bold gradient-text">{profile.xp} XP</div>
            </div>
            <div className="progress-bar" style={{ height: 4 }}>
              <div className="progress-fill xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-3 flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: 'none', }} >
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id as Page)}
                className={`nav-item w-full text-left min-h-[48px] touch-manipulation ${currentPage === item.id ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(168,85,247,0.2)', color: 'var(--purple-primary)' }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Streak display */}
        {profile.streak > 0 && (
          <div className="m-4 p-3 rounded-12 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{profile.streak}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Day Streak</div>
          </div>
        )}
      </aside>
    </>
  );
}
