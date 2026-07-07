import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useStore, loadUserData, checkAndUpdateGuestStreak } from './store/useStore';
import { useTimerEngine } from './hooks/useTimerEngine';
import { useDailyGoalWatcher } from './hooks/useDailyGoalWatcher';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Productivity from './pages/Productivity';
import Analytics from './pages/Analytics';
import Rewards from './pages/Rewards';
import Splits from './pages/Splits';
import Reports from './pages/Reports';
import AuthScreen from './pages/AuthScreen';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import AchievementNotification from './components/AchievementNotification';
import { processAutoAddRecurringExpenses } from './lib/recurringUtils';
import { applyPreferencesToDOM } from './store/useStore';


const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  finance: 'Finance & Budget',
  productivity: 'Productivity Center',
  analytics: 'Analytics & Trends',
  rewards: 'Rewards & Badges',
  splits: 'Group Splits',
  reports: 'Performance Reports',
  achievements: 'Achievement Center',
  settings: 'Personalization & Settings',
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

          // Create profile only if it doesn't already exist
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: session.user.id,
              display_name:
                session.user.user_metadata?.full_name ||
                session.user.email?.split('@')[0] ||
                '',
              avatar_url:
                session.user.user_metadata?.avatar_url || '',
              updated_at: new Date().toISOString(),
            });
          }
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
    return <AuthScreen />;
  }


  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', position: 'relative' }}>
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
      <main className="main-content" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', paddingLeft: window.innerWidth >= 1024 ? '2rem' : '0.75rem', paddingRight: window.innerWidth >= 768 ? '1.5rem' : '0.75rem', width: '100%', boxSizing: 'border-box', }} >
          <Header onMenuClick={() => setSidebarOpen(true)} title={PAGE_TITLES[currentPage]} />

          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'finance' && <Finance />}
          {currentPage === 'productivity' && <Productivity />}
          {currentPage === 'analytics' && <Analytics />}
          {currentPage === 'rewards' && <Rewards />}
          {currentPage === 'splits' && <Splits />}
          {currentPage === 'reports' && <Reports />}
          {currentPage === 'achievements' && <Achievements />}
          {currentPage === 'settings' && <Settings />}
        </div>
      </main >

      {/* Mobile navigation */}
      < MobileNav />

      {/* Global achievement notifications */}
      <AchievementNotification />
    </div >
  );
}
