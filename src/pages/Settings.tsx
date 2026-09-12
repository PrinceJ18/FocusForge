import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Palette, Brain, Target, Bell, DollarSign,
  BarChart, Accessibility, Database, User, Info, Save, LogOut, Trash2,
  Lock, Check, Moon, Sun, Monitor, Type, Download, Upload, ShieldAlert
} from 'lucide-react';
import { useStore, type UserPreferences, defaultPreferences } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/events';
import Button from '../components/ui/Button';

const ACCENT_COLORS = [
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'green', name: 'Green', color: '#10b981' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
];

export default function Settings() {
  const preferences = useStore(s => s.preferences);
  const updatePreferencesLocal = useStore(s => s.updatePreferencesLocal);
  const user = useStore(s => s.user);
  const profile = useStore(s => s.profile);
  const updateProfile = useStore(s => s.updateProfile);
  const expenses = useStore(s => s.expenses);
  const tasks = useStore(s => s.tasks);
  const focusSessions = useStore(s => s.focusSessions);
  const savingsGoals = useStore(s => s.savingsGoals);
  const customCategories = useStore(s => s.customCategories);
  const events = useStore(s => s.events);
  const recurringExpenses = useStore(s => s.recurringExpenses);
  const showNotification = useStore(s => s.showNotification);
  const [activeTab, setActiveTab] = useState<'appearance' | 'focus' | 'goals' | 'notifications' | 'finance' | 'analytics' | 'accessibility' | 'backup' | 'account' | 'about'>('appearance');

  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdatePref = async (key: keyof UserPreferences, value: any) => {
    updatePreferencesLocal({ [key]: value });
    if (user) {
      try {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to sync settings to Supabase, local cache active:', err);
      }
    }
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      updateProfile({ display_name: displayName, avatar_url: avatarUrl });
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
        showNotification({ type: 'success', title: 'Profile Saved', message: 'Your profile has been updated.' });
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Error', message: 'Failed to save profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.')) {
      if (user) {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
        window.location.reload();
      } else {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  // ----------------------------------------------------
  // DATA BACKUP & EXPORTS
  // ----------------------------------------------------
  const handleExportJSON = () => {
    const backupData = {
      profile,
      expenses,
      tasks,
      focusSessions,
      savingsGoals,
      customCategories,
      events,
      recurringExpenses,
      preferences,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusforge_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('backup_exported', 'system', 'json', { format: 'JSON' });
    showNotification({ type: 'success', title: 'Export Complete', message: 'Backup JSON downloaded successfully.' });
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Type,Title/Name,Amount/Minutes,Category,Date\n';

    // Add expenses
    expenses.forEach(e => {
      csvContent += `expense,"${e.title}",${e.amount},"${e.category}",${e.expense_date}\n`;
    });
    // Add focus sessions
    focusSessions.forEach(f => {
      csvContent += `focus,"Focus Session",${f.minutes},"focus",${f.session_date}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `focusforge_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    logEvent('backup_exported', 'system', 'csv', { format: 'CSV' });
    showNotification({ type: 'success', title: 'Export Complete', message: 'CSV transactions exported successfully.' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result;
        if (typeof raw !== 'string') {
          showNotification({ type: 'error', title: 'Import Failed', message: 'Could not read file contents.' });
          return;
        }

        const data = JSON.parse(raw);

        // Structural validation: ensure top-level fields are objects, not primitives
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          showNotification({ type: 'error', title: 'Import Failed', message: 'Backup file must contain a JSON object.' });
          return;
        }

        let applied = false;

        if (data.preferences && typeof data.preferences === 'object' && !Array.isArray(data.preferences)) {
          updatePreferencesLocal(data.preferences);
          applied = true;
        }

        if (data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile)) {
          updateProfile(data.profile);
          applied = true;
        }

        if (applied) {
          showNotification({ type: 'success', title: 'Import Complete', message: 'Backup data parsed and applied successfully!' });
          logEvent('backup_restored', 'system', 'json', { success: true });
        } else {
          showNotification({ type: 'error', title: 'Import Failed', message: 'No valid preferences or profile data found in backup file.' });
        }
      } catch (err) {
        showNotification({ type: 'error', title: 'Import Failed', message: 'Invalid backup file. Ensure it is valid JSON.' });
      }
    };
    reader.onerror = () => {
      showNotification({ type: 'error', title: 'Import Failed', message: 'Failed to read file. Please try again.' });
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'focus', label: 'Focus Clock', icon: <Brain size={16} /> },
    { id: 'goals', label: 'Daily Goals', icon: <Target size={16} /> },
    { id: 'notifications', label: 'Alerts', icon: <Bell size={16} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={16} /> },
    { id: 'analytics', label: 'Charts', icon: <BarChart size={16} /> },
    { id: 'accessibility', label: 'Accessibility', icon: <Accessibility size={16} /> },
    { id: 'backup', label: 'Backups', icon: <Database size={16} /> },
    { id: 'account', label: 'Account', icon: <User size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ] as const;

  return (
    <div className="page-enter space-y-6 text-left">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* TABS SIDEBAR */}
        <div className="lg:w-64 flex lg:flex-col overflow-x-auto no-scrollbar pb-2 lg:pb-0 gap-1.5 lg:gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap touch-manipulation min-h-[44px] shrink-0 ${activeTab === tab.id
                  ? 'bg-purple-500/10 border-purple-500/30 text-text-primary font-bold'
                  : 'bg-background-card border-border text-text-muted hover:bg-background-card-hover hover:text-text-primary'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT PANEL */}
        <div className="flex-1 glass-card p-5 sm:p-6 space-y-6">

          {/* SECTION 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Appearance Settings</h3>
                <p className="text-[11px] text-text-muted">Personalize styling, variables, theme overrides, and animation speeds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Visual Theme</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'dark', name: 'Dark Mode', icon: <Moon size={14} /> },
                      { id: 'light', name: 'Light Mode', icon: <Sun size={14} /> },
                      { id: 'amoled', name: 'AMOLED Pitch', icon: <Moon size={14} className="text-purple-400" /> },
                      { id: 'system', name: 'System Def', icon: <Monitor size={14} /> },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleUpdatePref('theme', t.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left ${preferences.theme === t.id ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        <span className="flex items-center gap-2">{t.icon} {t.name}</span>
                        {preferences.theme === t.id && <Check size={14} className="text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Accent Brand Color</label>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleUpdatePref('accent_color', c.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${preferences.accent_color === c.id ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Card Border Radius</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['rounded', 'modern', 'compact'].map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdatePref('card_style', s)}
                        className={`py-2 rounded-xl border text-center capitalize ${preferences.card_style === s ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Animations Density</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'full', label: 'Full Motion' },
                      { id: 'reduced', label: 'Reduced' },
                      { id: 'off', label: 'Disable' },
                    ].map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleUpdatePref('animation', a.id)}
                        className={`py-2 rounded-xl border text-center ${preferences.animation === a.id ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Base Font Size</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['small', 'medium', 'large'].map(f => (
                      <button
                        key={f}
                        onClick={() => handleUpdatePref('font_size', f)}
                        className={`py-2 rounded-xl border text-center capitalize ${preferences.font_size === f ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted mb-2 block text-xs">Layout Density</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['comfortable', 'compact'].map(d => (
                      <button
                        key={d}
                        onClick={() => handleUpdatePref('ui_density', d)}
                        className={`py-2 rounded-xl border text-center capitalize ${preferences.ui_density === d ? 'border-purple-500 bg-purple-500/5 text-text-primary font-bold' : 'bg-slate-950/40 border-border text-text-muted'
                          }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: FOCUS CLOCK */}
          {activeTab === 'focus' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Focus Timer Preferences</h3>
                <p className="text-[11px] text-text-muted">Configure default intervals, notification cues, and clock rings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label htmlFor="settings-pomodoro" className="font-semibold text-text-muted mb-1 block">Pomodoro Minutes</label>
                  <input
                    id="settings-pomodoro"
                    type="number"
                    value={preferences.default_pomodoro}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const clamped = isNaN(val) ? 25 : Math.max(1, Math.min(120, val));
                      handleUpdatePref('default_pomodoro', clamped);
                    }}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <label htmlFor="settings-short-break" className="font-semibold text-text-muted mb-1 block">Short Break Minutes</label>
                  <input
                    id="settings-short-break"
                    type="number"
                    value={preferences.default_short_break}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const clamped = isNaN(val) ? 5 : Math.max(1, Math.min(120, val));
                      handleUpdatePref('default_short_break', clamped);
                    }}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <label htmlFor="settings-long-break" className="font-semibold text-text-muted mb-1 block">Long Break Minutes</label>
                  <input
                    id="settings-long-break"
                    type="number"
                    value={preferences.default_long_break}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const clamped = isNaN(val) ? 15 : Math.max(1, Math.min(120, val));
                      handleUpdatePref('default_long_break', clamped);
                    }}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Auto Start Break</h4>
                    <p className="text-[10px] text-text-muted">Start the break countdown automatically when Pomodoro finishes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.auto_start_break}
                    onChange={(e) => handleUpdatePref('auto_start_break', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Auto Start Focus</h4>
                    <p className="text-[10px] text-text-muted">Start the next focus block automatically when break timer finishes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.auto_start_focus}
                    onChange={(e) => handleUpdatePref('auto_start_focus', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Play Completion Sound</h4>
                    <p className="text-[10px] text-text-muted">Play an audio sound when intervals complete.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.play_completion_sound}
                    onChange={(e) => handleUpdatePref('play_completion_sound', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Focus Ring Style</h4>
                    <p className="text-[10px] text-text-muted">Visual accent of the timer dial ring.</p>
                  </div>
                  <select
                    value={preferences.focus_ring_style}
                    onChange={(e) => handleUpdatePref('focus_ring_style', e.target.value)}
                    className="input-glass px-2.5 py-1 text-xs"
                  >
                    <option value="gradient">Gradient Glow</option>
                    <option value="solid">Solid Accent</option>
                    <option value="neon">Laser Neon</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: DAILY GOALS */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Daily Target Goals</h3>
                <p className="text-[11px] text-text-muted">Configure default benchmarks and adjust difficulty scaling.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="settings-focus-goal" className="font-semibold text-text-muted mb-1 block">Default Daily Focus Target (Minutes)</label>
                  <input
                    id="settings-focus-goal"
                    type="number"
                    value={preferences.default_daily_focus_goal}
                    onChange={(e) => handleUpdatePref('default_daily_focus_goal', parseInt(e.target.value) || 120)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  />
                </div>
                <div>
                  <label htmlFor="settings-task-goal" className="font-semibold text-text-muted mb-1 block">Default Daily Tasks Count Target</label>
                  <input
                    id="settings-task-goal"
                    type="number"
                    value={preferences.default_task_goal}
                    onChange={(e) => handleUpdatePref('default_task_goal', parseInt(e.target.value) || 5)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  />
                </div>
                <div>
                  <label htmlFor="settings-xp-goal" className="font-semibold text-text-muted mb-1 block">Default Daily XP Target</label>
                  <input
                    id="settings-xp-goal"
                    type="number"
                    value={preferences.default_xp_goal}
                    onChange={(e) => handleUpdatePref('default_xp_goal', parseInt(e.target.value) || 100)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  />
                </div>
                <div>
                  <label htmlFor="settings-budget-goal" className="font-semibold text-text-muted mb-1 block">Default Monthly Budget Target</label>
                  <input
                    id="settings-budget-goal"
                    type="number"
                    value={preferences.default_budget_goal}
                    onChange={(e) => handleUpdatePref('default_budget_goal', parseFloat(e.target.value) || 10000)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Goal Difficulty</h4>
                    <p className="text-[10px] text-text-muted">Easy (70%), Medium (100%), Hard (130%), Adaptive (autoscale based on history).</p>
                  </div>
                  <select
                    value={preferences.goal_difficulty}
                    onChange={(e) => handleUpdatePref('goal_difficulty', e.target.value)}
                    className="input-glass px-2.5 py-1 text-xs"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Notification Categories</h3>
                <p className="text-[11px] text-text-muted">Manage popups, reminder times, and sounds.</p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { key: 'notify_xp', label: 'XP Gained', desc: 'Alert when claiming or earning XP points.' },
                  { key: 'notify_level_up', label: 'Level Ups', desc: 'Banner toast when rising to next character level.' },
                  { key: 'notify_achievements', label: 'Achievements Unlocks', desc: 'Congratulatory notification for custom achievements.' },
                  { key: 'notify_badges', label: 'Badges Claimed', desc: 'Notification on unlocking collectible stickers.' },
                  { key: 'notify_recurring_expenses', label: 'Recurring Bills Due', desc: 'Notify upcoming/overdue subscription events.' },
                  { key: 'notify_arena_champion', label: 'Arena Champion Alerts', desc: 'Celebration modal when achieving #1 Weekly Champion status.' },
                  { key: 'notify_arena_personal_best', label: 'Arena Personal Best', desc: 'Pop-up celebration when breaking your highest Arena Score record.' },
                  { key: 'notify_arena_rank_up', label: 'Arena Rank Up Alerts', desc: 'Notification when climbing to higher rank positions.' },
                  { key: 'notify_arena_activity', label: 'Arena Public Feed', desc: 'Updates on public level-ups and challenge completions.' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                    <div>
                      <h4 className="font-bold text-text-primary">{n.label}</h4>
                      <p className="text-[10px] text-text-muted">{n.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!(preferences as any)[n.key]}
                      onChange={(e) => handleUpdatePref(n.key as any, e.target.checked)}
                      className="w-4 h-4 accent-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: FINANCE */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Finance Settings</h3>
                <p className="text-[11px] text-text-muted">Configure currency tags, spending limits, and week starters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="settings-currency" className="font-semibold text-text-muted mb-1 block">Preferred Currency Symbol</label>
                  <select
                    id="settings-currency"
                    value={preferences.currency}
                    onChange={(e) => handleUpdatePref('currency', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="settings-week-start" className="font-semibold text-text-muted mb-1 block">Week Starts On</label>
                  <select
                    id="settings-week-start"
                    value={preferences.week_start_day}
                    onChange={(e) => handleUpdatePref('week_start_day', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Analytics View Styles</h3>
                <p className="text-[11px] text-text-muted">Customize charting parameters and default formats.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="settings-time-format" className="font-semibold text-text-muted mb-1 block">Preferred Time Format</label>
                  <select
                    id="settings-time-format"
                    value={preferences.preferred_time_format}
                    onChange={(e) => handleUpdatePref('preferred_time_format', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  >
                    <option value="12h">12-Hour (AM/PM)</option>
                    <option value="24h">24-Hour Military</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="settings-date-format" className="font-semibold text-text-muted mb-1 block">Preferred Date Format</label>
                  <select
                    id="settings-date-format"
                    value={preferences.preferred_date_format}
                    onChange={(e) => handleUpdatePref('preferred_date_format', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-text-primary"
                  >
                    <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                    <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                    <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: ACCESSIBILITY */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Accessibility Toggles</h3>
                <p className="text-[11px] text-text-muted">Enable helpers to improve viewing contrast and support keyboard loops.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">High Contrast Colors</h4>
                    <p className="text-[10px] text-text-muted">Boosts borders and highlights text values to aid readers.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.high_contrast}
                    onChange={(e) => handleUpdatePref('high_contrast', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background-card rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-text-primary">Keyboard Hotkey Navigation</h4>
                    <p className="text-[10px] text-text-muted">Enables logical focus focus outline highlights.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.keyboard_navigation}
                    onChange={(e) => handleUpdatePref('keyboard_navigation', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: BACKUPS */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Backup & Exports Center</h3>
                <p className="text-[11px] text-text-muted">Download your transactions, tasks, logs, and state parameters locally.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-background-card rounded-xl border border-border text-center">
                  <Download size={24} className="mx-auto mb-2 text-purple-400" />
                  <h4 className="font-bold text-text-primary mb-1">Export Data</h4>
                  <p className="text-[10px] text-text-muted mb-3">Download complete JSON state parameters or CSV files.</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="secondary" onClick={handleExportJSON} className="px-3 py-1.5 font-semibold text-xs">
                      JSON
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} className="px-3 py-1.5 font-semibold text-xs text-text-muted border-border">
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-background-card rounded-xl border border-border text-center">
                  <Upload size={24} className="mx-auto mb-2 text-cyan-400" />
                  <h4 className="font-bold text-text-primary mb-1">Restore State</h4>
                  <p className="text-[10px] text-text-muted mb-3">Select and upload a previously generated backup JSON file.</p>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                  <Button
                    variant="neon"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30"
                  >
                    Upload JSON
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Profile Control</h3>
                <p className="text-[11px] text-text-muted">Edit account variables or securely sign out.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="settings-display-name" className="font-semibold text-text-muted mb-1 block">Display Name</label>
                    <input
                      id="settings-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-glass w-full px-3 py-2 text-text-primary"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-avatar-url" className="font-semibold text-text-muted mb-1 block">Avatar URL</label>
                    <input
                      id="settings-avatar-url"
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="input-glass w-full px-3 py-2 text-text-primary"
                      placeholder="e.g. https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    isLoading={isSavingProfile}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold rounded-xl hover:bg-purple-500/30 flex items-center gap-1.5"
                  >
                    <Save size={14} /> Update Profile
                  </Button>
                </div>

                <hr className="border-border my-4" />

                <div>
                  <h4 className="font-bold text-text-primary mb-2">Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="px-4 py-2 font-semibold text-text-secondary border-border hover:text-text-primary flex items-center gap-1.5"
                    >
                      <LogOut size={14} /> Sign Out
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 font-semibold flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 10: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">About FocusForge</h3>
                <p className="text-[11px] text-text-muted">Licenses, developer coordinates, and system metrics.</p>
              </div>

              <div className="p-4 bg-background-card rounded-xl border border-border space-y-3 text-xs text-text-muted">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Application Version</span>
                  <span className="font-bold text-text-primary">v1.1.2-beta</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Developer Team</span>
                  <span className="font-bold text-text-primary">FocusForge Contributors</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Core Libraries</span>
                  <span className="font-bold text-text-primary">React, TypeScript, TailwindCSS, Zustand</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Database Hosting</span>
                  <span className="font-bold text-text-primary">Supabase Cloud PostgreSQL</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
