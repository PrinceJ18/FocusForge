import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { useStore, loadUserData, checkAndUpdateGuestStreak, applyPreferencesToDOM } from './store/useStore';
import { useTimerEngine } from './hooks/useTimerEngine';
import { useDailyGoalWatcher } from './hooks/useDailyGoalWatcher';
import { useArenaEngine } from './hooks/useArenaEngine';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PageLayout, { PAGE_TITLES } from './components/layout/PageLayout';
import MobileNav from './components/MobileNav';
import AchievementNotification from './components/AchievementNotification';
import PageErrorBoundary from './components/PageErrorBoundary';
import { processAutoAddRecurringExpenses } from './lib/recurringUtils';
import { LoadingState, PageSkeleton } from './components/ui/Loading';
import { WifiOff } from 'lucide-react';

// Lazy loaded pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Finance = React.lazy(() => import('./pages/Finance'));
const Productivity = React.lazy(() => import('./pages/Productivity'));
const Analytics = React.lazy(() => import('./pages/Analytics'));

const Splits = React.lazy(() => import('./pages/Splits'));
const Reports = React.lazy(() => import('./pages/Reports'));
const AuthScreen = React.lazy(() => import('./pages/AuthScreen'));
const Achievements = React.lazy(() => import('./pages/Achievements'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Friends = React.lazy(() => import('./pages/Friends'));
const Arena = React.lazy(() => import('./pages/Arena'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const CommandCenter = React.lazy(() => import('./pages/CommandCenter'));

const TAB_TITLES: Record<string, string> = {
  dashboard: 'FocusForge — Dashboard',
  finance: 'FocusForge — Finance & Budget',
  productivity: 'FocusForge — Focus & Tasks',
  analytics: 'FocusForge — Analytics Intelligence',
  friends: 'FocusForge — Friends & Social',
  arena: 'FocusForge — Productivity Arena',
  splits: 'FocusForge — Split Expenses',
  reports: 'FocusForge — Performance Reports',
  achievements: 'FocusForge — Achievement Center',
  settings: 'FocusForge — Settings & Preferences',
  notifications: 'FocusForge — Notification Center',
  'command-center': 'FocusForge — AI Command Center',
};

export default function App() {
  // Individual selectors prevent cascade rerenders when unrelated store fields change
  const currentPage = useStore(s => s.currentPage);
  const setPage = useStore(s => s.setPage);
  const setUser = useStore(s => s.setUser);
  const user = useStore(s => s.user);
  const preferences = useStore(s => s.preferences);
  const isOnline = useOnlineStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stable callback prevents Sidebar from rerendering when App state changes
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);

  // Apply user styling preferences to root DOM on value change
  useEffect(() => {
    applyPreferencesToDOM(preferences);
  }, [preferences]);

  // Global timer engine — runs the countdown interval at the App level
  // so it persists across all page navigations.
  useTimerEngine();
  useDailyGoalWatcher();
  useArenaEngine();

  // Dynamically update the browser tab title
  useEffect(() => {
    document.title = TAB_TITLES[currentPage] || 'FocusForge — Operating System';
  }, [currentPage]);

  // Global safety net: catch unhandled promise rejections that slip through
  // individual try/catch blocks, preventing silent failures in production.
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (import.meta.env.DEV) {
        console.error('[FocusForge] Unhandled promise rejection:', event.reason);
      }
      // Prevent the browser from logging a noisy default error
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  useEffect(() => {
    // Check initial session
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        await loadUserData(session.user.id);
        await processAutoAddRecurringExpenses();
      } else {
        checkAndUpdateGuestStreak();
      }

      setLoading(false);
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);

          await loadUserData(session.user.id);
          await processAutoAddRecurringExpenses();
        } else {
          setUser(null);

          useStore.setState({
            expenses: [],
            tasks: [],
            focusSessions: [],
            savingsGoals: [],
            customCategories: [],
            splits: [],
            taskSections: [],
            taskCompletions: [],
            dataLoaded: false,
            profile: {
              xp: 0,
              streak: 0,
              last_active_date: '',
              monthly_budget: 0,
              total_savings: 0,
              badges: [],
              display_name: 'User',
              avatar_url: '',
              friend_code: '',
              daily_challenge_claims: { date: '', claimed: [] },
            },
          });
          checkAndUpdateGuestStreak();
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-grid"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Ambient orbs */}
        <div
          className="ambient-orb"
          style={{ width: 400, height: 400, background: 'rgba(168,85,247,0.08)', top: '-100px', left: '-100px' }}
        />
        <div
          className="ambient-orb"
          style={{ width: 300, height: 300, background: 'rgba(236,72,153,0.06)', bottom: '-80px', right: '-80px' }}
        />

        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 0 40px rgba(168,85,247,0.4)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold mb-2 gradient-text"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            FocusForge
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your workspace...</p>
          <div className="loading-spinner mx-auto mt-6" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState message="Loading Auth..." /></div>}>
        <AuthScreen />
      </Suspense>
    );
  }


  // Determine which page to render — fallback to dashboard for unknown routes
  // (protects against persisted state corruption from localStorage)
  const KNOWN_PAGES = new Set([
    'dashboard', 'finance', 'productivity', 'analytics', 'splits',
    'reports', 'achievements', 'settings', 'friends', 'arena',
    'notifications', 'command-center',
  ]);
  const activePage = KNOWN_PAGES.has(currentPage) ? currentPage : 'dashboard';

  // Stable callback for PageErrorBoundary navigation
  const handleErrorNavigateHome = useCallback(() => setPage('dashboard'), [setPage]);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', position: 'relative' }}>
      {/* Skip to content — keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-lg focus:text-white focus:font-semibold focus:text-sm"
        style={{ background: 'var(--accent-primary)' }}
      >
        Skip to content
      </a>

      {/* Offline indicator banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-xs font-medium py-1.5 px-4"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#fca5a5',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            position: 'relative',
            zIndex: 9999,
          }}
        >
          <WifiOff size={13} />
          You're offline — changes will sync when connection returns
        </div>
      )}

      {/* Background effects */}
      <div
        className="ambient-orb"
        style={{ width: 500, height: 500, background: 'rgba(168,85,247,0.05)', top: '-150px', left: '-100px' }}
      />
      <div
        className="ambient-orb"
        style={{ width: 400, height: 400, background: 'rgba(236,72,153,0.04)', bottom: '-100px', right: '-100px' }}
      />
      <div
        className="ambient-orb"
        style={{ width: 300, height: 300, background: 'rgba(6,182,212,0.03)', top: '50%', right: '20%' }}
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content */}
      <main id="main-content" className="main-content relative z-10">
        <PageLayout onMenuClick={() => setSidebarOpen(true)}>
          <PageErrorBoundary onNavigateHome={handleErrorNavigateHome}>
            <Suspense fallback={<div className="p-4 md:p-8"><PageSkeleton /></div>}>
              {activePage === 'dashboard' && <Dashboard />}
              {activePage === 'finance' && <Finance />}
              {activePage === 'productivity' && <Productivity />}
              {activePage === 'analytics' && <Analytics />}

              {activePage === 'splits' && <Splits />}
              {activePage === 'reports' && <Reports />}
              {activePage === 'achievements' && <Achievements />}
              {activePage === 'settings' && <Settings />}
              {activePage === 'friends' && <Friends />}
              {activePage === 'arena' && <Arena />}
              {activePage === 'notifications' && <Notifications />}
              {activePage === 'command-center' && <CommandCenter />}
            </Suspense>
          </PageErrorBoundary>
        </PageLayout>
      </main>

      {/* Mobile navigation */}
      <MobileNav />

      {/* Global achievement notifications */}
      <AchievementNotification />
    </div>
  );
}
