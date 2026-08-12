import React from 'react';
import { LayoutDashboard, Wallet, Timer, BarChart3, Trophy, Users, Zap, X, BookOpen, Award, Settings } from 'lucide-react';
import { useStore, type Page } from '../store/useStore';
import { calculateCurrentLevel, calculateXPProgress } from '../lib/statistics';
import useRouteChangeCleanup from '../hooks/useRouteChangeCleanup';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: Array<{ id: string; label: string; icon: React.ReactNode; badge?: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'finance', label: 'Finance', icon: <Wallet size={18} /> },
  { id: 'productivity', label: 'Focus', icon: <Timer size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'arena', label: 'Arena', icon: <Trophy size={18} /> },
  { id: 'friends', label: 'Friends', icon: <Users size={18} /> },
  { id: 'reports', label: 'Performance Reports', icon: <BookOpen size={18} /> },
  { id: 'achievements', label: 'Achievement Center', icon: <Award size={18} /> },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentPage, setPage, profile, user } = useStore();
  const levelInfo = calculateCurrentLevel(profile.xp);

  const xpLevel = levelInfo.level;
  const xpProgress = calculateXPProgress(profile.xp);

  useRouteChangeCleanup(onClose, isOpen);

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
        <nav aria-label="Main navigation" className="px-3 flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: 'none', }} >
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id as Page)}
                aria-current={currentPage === item.id ? 'page' : undefined}
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

        {/* Tools Section */}
        <div className="px-4 pb-4 shrink-0">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Tools</h3>
          <div className="space-y-2">
            <button
              title="Expense Buddy"
              onClick={() => handleNav('splits')}
              className={`w-full flex items-center p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(168,85,247,0.15)] ${currentPage === 'splits' ? 'border-purple-500/50 bg-purple-500/10' : ''}`}
            >
              <div className="w-8 h-8 shrink-0 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                <Users size={16} />
              </div>
              <div className="text-left flex-1 min-w-0 overflow-hidden">
                <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors truncate">Expense Buddy</div>
                <div className="text-[9px] text-slate-400 truncate">AI-powered assistant</div>
              </div>
            </button>
            <button
              title="Settings"
              onClick={() => handleNav('settings')}
              className={`w-full flex items-center p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-slate-500/30 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.05)] ${currentPage === 'settings' ? 'border-slate-500/50 bg-slate-500/10' : ''}`}
            >
              <div className="w-8 h-8 shrink-0 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200 group-hover:rotate-45">
                <Settings size={16} />
              </div>
              <div className="text-left flex-1 min-w-0 overflow-hidden">
                <div className="text-xs font-bold text-white transition-colors truncate">Settings</div>
                <div className="text-[9px] text-slate-400 truncate">Preferences & config</div>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
