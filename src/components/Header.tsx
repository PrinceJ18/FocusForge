import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { getLevelInfo } from "../lib/levels";
interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

const PAGE_SUBTITLES: Record<string, string> = {
  dashboard: 'Your productivity & finance overview',
  finance: 'Track expenses & manage budget',
  productivity: 'Focus sessions & task management',
  analytics: 'Insights & data visualization',
  rewards: 'Achievements & gamification',
  splits: 'Track and settle shared expenses with anyone',
  achievements: 'Unlock badges, track milestones, and view your complete journey',
  settings: 'Personalize colors, theme overrides, layout variables, and target goals',
};

export default function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const { user, profile, currentPage } = useStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
      className="flex items-center justify-between mb-8"
      style={{ paddingTop: 4 }}
    >
      <div className="flex items-center gap-4">
        <Button
          variant="icon"
          onClick={onMenuClick}
          className="md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded="false"
        >
          <Menu size={20} aria-hidden="true" />
        </Button>

        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)', lineHeight: 1.2 }}
          >
            {title}
          </h1>
          {displaySubtitle && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displaySubtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Streak badge */}
        {profile.streak > 0 && (
          <Badge variant="warning" size="md" className="hidden sm:flex items-center gap-1">
            <span className="text-sm">🔥</span>
            <span>{profile.streak}d</span>
          </Badge>
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                color: 'var(--text-primary)',
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white' }}
              >
                {displayName[0].toUpperCase()}
              </div>
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
}


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



