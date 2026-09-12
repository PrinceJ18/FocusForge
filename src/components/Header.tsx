import React, { memo, useEffect, useRef, useState, useMemo } from 'react';
import { Menu, Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { getLevelInfo } from "../lib/levels";
import useRouteChangeCleanup from '../hooks/useRouteChangeCleanup';
import { useCoach } from '../hooks/useCoach';
import { UserAvatar } from './ui/UserAvatar';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

const PAGE_SUBTITLES: Record<string, string> = {
  dashboard: 'Your productivity & finance overview',
  finance: 'Track expenses & manage budget',
  productivity: 'Focus sessions & task management',
  analytics: 'Insights & data visualization',
  arena: 'Compete with friends, climb the leaderboard, and celebrate your productivity journey',
  friends: 'Connect with friends, build your productivity network, and grow together',
  splits: 'Track shared expenses, split bills, and settle balances with friends and groups.',
  reports: 'Analyze your productivity, focus sessions, task completion, and financial performance',
  achievements: 'Unlock badges, track milestones, and view your complete journey',
  settings: 'Personalize themes, colors, layouts, preferences, and productivity goals.',
  'command-center': 'Executive intelligence cockpit — unified AI-driven performance overview.',
};

const Header = memo(function Header({ onMenuClick, title, subtitle, headerActions }: HeaderProps) {
  const user = useStore(s => s.user);
  const profile = useStore(s => s.profile);
  const currentPage = useStore(s => s.currentPage);
  const setPage = useStore(s => s.setPage);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const coach = useCoach();

  const totalUnread = useMemo(() => {
    let count = 0;
    if (coach.recommendations.length > 0) count++;
    count += coach.riskAssessment.length;
    if (coach.achievementsSummary) {
      count += coach.achievementsSummary.recentAchievements.length;
      count += coach.achievementsSummary.approachingMilestones.length;
    }
    if (coach.predictions) count += 2;
    if (coach.habits) count += 4;
    count += Math.min(coach.timeline.length, 20);
    return count;
  }, [coach]);

  useRouteChangeCleanup(() => setDropdownOpen(false), dropdownOpen);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  const displayName = profile.display_name || user?.email?.split('@')[0] || 'User';
  const displaySubtitle = subtitle || PAGE_SUBTITLES[currentPage] || '';

  return (
    <header
      role="banner"
      className="flex items-center justify-between py-3 sm:py-3.5"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <Button
          variant="icon"
          onClick={onMenuClick}
          className="md:hidden touch-target shrink-0"
          aria-label="Toggle navigation menu"
          aria-expanded="false"
        >
          <Menu size={20} aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1
            className="text-lg sm:text-xl md:text-2xl font-bold truncate"
            style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)', lineHeight: 1.2 }}
          >
            {title}
          </h1>
          {displaySubtitle && (
            <p className="text-xs sm:text-sm mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {displaySubtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {headerActions && (
          <div className="flex items-center gap-2 mr-1 sm:mr-2">
            {headerActions}
          </div>
        )}

        {/* Streak badge */}
        {profile.streak > 0 && (
          <Badge variant="warning" size="md" className="hidden sm:flex items-center gap-1">
            <span className="text-sm">🔥</span>
            <span>{profile.streak}d</span>
          </Badge>
        )}

        {/* Notification Bell */}
        {user && (
          <button
            onClick={() => setPage('notifications')}
            className="relative flex items-center justify-center rounded-12 transition-all h-[44px] w-[44px]"
            aria-label="Notifications"
            style={{
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <Bell size={20} style={{ color: 'var(--text-primary)' }} />
            {totalUnread > 0 && (
              <span 
                className="absolute -top-1 -right-1 flex items-center justify-center text-[10px] font-bold text-text-primary rounded-full px-1 min-w-[18px] h-[18px]"
                style={{ background: 'var(--brand-primary)', boxShadow: '0 0 0 2px var(--bg-primary)' }}
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        )}

        {/* User menu */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-12 transition-all"
              aria-label="User profile menu"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              style={{
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                color: 'var(--text-primary)',
              }}
            >
              <UserAvatar profile={profile} email={user.email} size="xs" />
              <span className="hidden sm:block text-sm font-medium">{displayName}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-16 overflow-hidden"
                style={{
                  background: 'rgba(10,10,20,0.98)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 200,
                }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="progress-bar flex-1" style={{ height: 4 }}>
                      <div className="progress-fill xp-bar-fill" style={{ width: `${profile.xp % 100}%` }} />
                    </div>
                    <span className="text-xs gradient-text font-bold">{profile.xp} XP</span>
                  </div>
                </div>

                <div className="p-2">

                  <button
                    onClick={() => {
                      setProfileOpen(true);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-10 text-sm text-left transition-all"
                    style={{ color: 'var(--text-secondary)', borderRadius: 10 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <User size={14} />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      useStore.getState().setPage('settings');
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-10 text-sm text-left transition-all"
                    style={{ color: 'var(--text-secondary)', borderRadius: 10 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Settings size={14} />
                    Settings
                  </button>


                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-10 text-sm text-left transition-all"
                    style={{ color: '#ef4444', borderRadius: 10 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <LoginButton onClick={() => setAuthOpen(true)} />
        )}
      </div>
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />



      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />

    </header>
  );
});

function LoginButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="min-w-[100px]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-2">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Sign In
    </Button>
  );
}

export default Header;
