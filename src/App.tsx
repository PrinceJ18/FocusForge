import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { useStore, loadUserData, checkAndUpdateGuestStreak, applyPreferencesToDOM } from './store/useStore';
import { useTimerEngine } from './hooks/useTimerEngine';
import { useDailyGoalWatcher } from './hooks/useDailyGoalWatcher';
import { useArenaEngine } from './hooks/useArenaEngine';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PageLayout, { PAGE_TITLES } from './components/layout/PageLayout';
import MobileNav from './components/MobileNav';
import AchievementNotification from './components/AchievementNotification';
import { processAutoAddRecurringExpenses } from './lib/recurringUtils';
import { LoadingState, PageSkeleton } from './components/ui/Loading';

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

const TAB_TITLES: Record<string, string> = {
  dashboard: 'FocusForge Dashboard',
  finance: 'FocusForge Finance',
  productivity: 'FocusForge Focus',
  analytics: 'FocusForge Analytics',
  friends: 'FocusForge Friends',
  arena: 'FocusForge Arena',
  splits: 'FocusForge Splits',
  reports: 'FocusForge Reports',
  achievements: 'FocusForge Achievements',
  settings: 'FocusForge Settings',
};

export default function App() {
  const { currentPage, setUser, user, dataLoaded, setDataLoaded, preferences } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    document.title = TAB_TITLES[currentPage] || 'FocusForge Focus Finance Tracker';
  }, [currentPage]);

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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main id="main-content" className="main-content relative z-10">
        <PageLayout onMenuClick={() => setSidebarOpen(true)}>
          <Suspense fallback={<div className="p-4 md:p-8"><PageSkeleton /></div>}>
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'finance' && <Finance />}
            {currentPage === 'productivity' && <Productivity />}
            {currentPage === 'analytics' && <Analytics />}

            {currentPage === 'splits' && <Splits />}
            {currentPage === 'reports' && <Reports />}
            {currentPage === 'achievements' && <Achievements />}
            {currentPage === 'settings' && <Settings />}
            {currentPage === 'friends' && <Friends />}
            {currentPage === 'arena' && <Arena />}
          </Suspense>
        </PageLayout>
      </main>

      {/* Mobile navigation */}
      < MobileNav />

      {/* Global achievement notifications */}
      <AchievementNotification />
    </div >
  );
}
