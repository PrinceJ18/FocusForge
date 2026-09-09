import React, { memo } from 'react';
import { LayoutDashboard, Wallet, Timer, BarChart3, Trophy, Users, Zap, X, BookOpen, Award, Settings, Bell, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, type Page } from '../store/useStore';
import { calculateCurrentLevel, calculateXPProgress } from '../lib/statistics';
import useRouteChangeCleanup from '../hooks/useRouteChangeCleanup';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Desktop-only: whether sidebar is collapsed to icon-only mode */
  collapsed: boolean;
  /** Desktop-only: toggle collapsed state */
  onToggleCollapse: () => void;
}

const navItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'productivity', label: 'Productivity Center', icon: <Timer size={18} /> },
  { id: 'finance', label: 'Finance & Budget', icon: <Wallet size={18} /> },
  { id: 'analytics', label: 'Analytics & Trends', icon: <BarChart3 size={18} /> },
  { id: 'arena', label: 'Productivity Arena', icon: <Trophy size={18} /> },
  { id: 'friends', label: 'Friends & Community', icon: <Users size={18} /> },
  { id: 'reports', label: 'Performance Reports', icon: <BookOpen size={18} /> },
  { id: 'achievements', label: 'Achievement Center', icon: <Award size={18} /> },
  { id: 'command-center', label: 'AI Command Center', icon: <Brain size={18} /> },
];

const Sidebar = memo(function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const currentPage = useStore(s => s.currentPage);
  const setPage = useStore(s => s.setPage);
  const profile = useStore(s => s.profile);
  const user = useStore(s => s.user);
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
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{ zIndex: 101, height: '100vh' }}
        aria-label="Main navigation"
      >
        {/* Collapse toggle button — desktop only, floats outside sidebar */}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          type="button"
        >
          {collapsed ? <ChevronRight size={20} strokeWidth={2.5} /> : <ChevronLeft size={20} strokeWidth={2.5} />}
        </button>

        {/* Inner container — clips overflow for content but button stays visible */}
        <div className="sidebar-inner">
          {/* Logo */}
          <div className="sidebar-header p-4 sm:p-6 flex items-center justify-between">
            <div className="sidebar-logo-section">
              <div
                className="sidebar-logo-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
              >
                <Zap size={18} className="text-white" />
              </div>
              <div className="sidebar-label">
                <h1 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
                  FocusForge
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Focus Finance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="sidebar-mobile-close md:hidden p-1 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          </div>

          {/* User profile preview */}
          {user && (
            <div
              className="sidebar-profile mx-4 mb-4 p-3"
              style={{
                background: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: 12,
                transition: 'padding 250ms ease, margin 250ms ease',
              }}
            >
              <div className="sidebar-profile-inner flex items-center gap-3 mb-2">
                <div
                  className="sidebar-profile-avatar w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white' }}
                >
                  {(profile.display_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="sidebar-label flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.display_name || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Level {xpLevel}</p>
                </div>
                <div className="sidebar-label text-xs font-bold gradient-text">{profile.xp} XP</div>
              </div>
              <div
                className="progress-bar"
                style={{ height: 4 }}
                role="progressbar"
                aria-valuenow={xpProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Level progress: ${Math.round(xpProgress)}%`}
              >
                <div className="progress-fill xp-bar-fill" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav id="sidebar-nav" aria-label="Main navigation" className="px-3 flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: 'none' }} >
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id as Page)}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  className={`nav-item w-full text-left min-h-[48px] touch-manipulation ${currentPage === item.id ? 'active' : ''}`}
                >
                  <span className="nav-icon shrink-0">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                  {/* Tooltip for collapsed state */}
                  <span className="sidebar-tooltip" aria-hidden="true">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Tools Section */}
          <div className="sidebar-tools-section px-4 pb-4 shrink-0">
            <h3 className="sidebar-label text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Tools</h3>
            <div className="space-y-2">
              <button
                title="Expense Buddy"
                onClick={() => handleNav('splits')}
                className={`sidebar-tool-btn w-full flex items-center p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(168,85,247,0.15)] relative ${currentPage === 'splits' ? 'border-purple-500/50 bg-purple-500/10' : ''}`}
              >
                <div className="sidebar-tool-icon w-8 h-8 shrink-0 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                  <Users size={16} />
                </div>
                <div className="sidebar-label text-left flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors truncate">Expense Buddy</div>
                  <div className="text-[9px] text-slate-400 truncate">AI-powered assistant</div>
                </div>
                <span className="sidebar-tooltip" aria-hidden="true">Expense Buddy</span>
              </button>
              <button
                title="Settings"
                onClick={() => handleNav('settings')}
                className={`sidebar-tool-btn w-full flex items-center p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-slate-500/30 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.05)] relative ${currentPage === 'settings' ? 'border-slate-500/50 bg-slate-500/10' : ''}`}
              >
                <div className="sidebar-tool-icon w-8 h-8 shrink-0 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200 group-hover:rotate-45">
                  <Settings size={16} />
                </div>
                <div className="sidebar-label text-left flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-bold text-white transition-colors truncate">Settings</div>
                  <div className="text-[9px] text-slate-400 truncate">Preferences & config</div>
                </div>
                <span className="sidebar-tooltip" aria-hidden="true">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;
