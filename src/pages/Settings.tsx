import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Palette, Brain, Target, Bell, DollarSign,
  BarChart, Accessibility, Database, User, Info, Save, LogOut, Trash2,
  Lock, Check, Moon, Sun, Monitor, Type, Download, Upload, ShieldAlert
} from 'lucide-react';
import { useStore, type UserPreferences, defaultPreferences } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/events';

const ACCENT_COLORS = [
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'green', name: 'Green', color: '#10b981' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
];

export default function Settings() {
  const { preferences, updatePreferencesLocal, user, profile, updateProfile, expenses, tasks, focusSessions, savingsGoals, customCategories, events, recurringExpenses } = useStore();
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

  const handleSaveProfile = async () => {
    updateProfile({ display_name: displayName, avatar_url: avatarUrl });
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });
      alert('Profile updated successfully!');
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
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.preferences) updatePreferencesLocal(data.preferences);
        if (data.profile) updateProfile(data.profile);
        
        alert('Backup data parsed and applied successfully!');
        logEvent('backup_restored', 'system', 'json', { success: true });
      } catch (err) {
        alert('Invalid backup file structure!');
      }
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
    <div className="page-enter space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* TABS SIDEBAR */}
        <div className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/10 border-purple-500/20 text-white font-bold'
                  : 'bg-white/2 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
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
                <h3 className="text-sm font-bold text-white mb-1">Appearance Settings</h3>
                <p className="text-[11px] text-slate-500">Personalize styling, variables, theme overrides, and animation speeds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Visual Theme</label>
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
                        className={`flex items-center justify-between p-3 rounded-xl border text-left ${
                          preferences.theme === t.id ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-2">{t.icon} {t.name}</span>
                        {preferences.theme === t.id && <Check size={14} className="text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Accent Brand Color</label>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleUpdatePref('accent_color', c.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                          preferences.accent_color === c.id ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Card Border Radius</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['rounded', 'modern', 'compact'].map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdatePref('card_style', s)}
                        className={`py-2 rounded-xl border text-center capitalize ${
                          preferences.card_style === s ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Animations Density</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'full', label: 'Full Motion' },
                      { id: 'reduced', label: 'Reduced' },
                      { id: 'off', label: 'Disable' },
                    ].map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleUpdatePref('animation', a.id)}
                        className={`py-2 rounded-xl border text-center ${
                          preferences.animation === a.id ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Base Font Size</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['small', 'medium', 'large'].map(f => (
                      <button
                        key={f}
                        onClick={() => handleUpdatePref('font_size', f)}
                        className={`py-2 rounded-xl border text-center capitalize ${
                          preferences.font_size === f ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-2 block text-xs">Layout Density</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['comfortable', 'compact'].map(d => (
                      <button
                        key={d}
                        onClick={() => handleUpdatePref('ui_density', d)}
                        className={`py-2 rounded-xl border text-center capitalize ${
                          preferences.ui_density === d ? 'border-purple-500 bg-purple-500/5 text-white font-bold' : 'bg-slate-950/40 border-white/5 text-slate-400'
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
                <h3 className="text-sm font-bold text-white mb-1">Focus Timer Preferences</h3>
                <p className="text-[11px] text-slate-500">Configure default intervals, notification cues, and clock rings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Pomodoro Minutes</label>
                  <input
                    type="number"
                    value={preferences.default_pomodoro}
                    onChange={(e) => handleUpdatePref('default_pomodoro', parseInt(e.target.value) || 25)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Short Break Minutes</label>
                  <input
                    type="number"
                    value={preferences.default_short_break}
                    onChange={(e) => handleUpdatePref('default_short_break', parseInt(e.target.value) || 5)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Long Break Minutes</label>
                  <input
                    type="number"
                    value={preferences.default_long_break}
                    onChange={(e) => handleUpdatePref('default_long_break', parseInt(e.target.value) || 15)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Auto Start Break</h4>
                    <p className="text-[10px] text-slate-500">Start the break countdown automatically when Pomodoro finishes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.auto_start_break}
                    onChange={(e) => handleUpdatePref('auto_start_break', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Auto Start Focus</h4>
                    <p className="text-[10px] text-slate-500">Start the next focus block automatically when break timer finishes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.auto_start_focus}
                    onChange={(e) => handleUpdatePref('auto_start_focus', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Play Completion Sound</h4>
                    <p className="text-[10px] text-slate-500">Play an audio sound when intervals complete.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.play_completion_sound}
                    onChange={(e) => handleUpdatePref('play_completion_sound', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Focus Ring Style</h4>
                    <p className="text-[10px] text-slate-500">Visual accent of the timer dial ring.</p>
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
                <h3 className="text-sm font-bold text-white mb-1">Daily Target Goals</h3>
                <p className="text-[11px] text-slate-500">Configure default benchmarks and adjust difficulty scaling.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Default Daily Focus Target (Minutes)</label>
                  <input
                    type="number"
                    value={preferences.default_daily_focus_goal}
                    onChange={(e) => handleUpdatePref('default_daily_focus_goal', parseInt(e.target.value) || 120)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Default Daily Tasks Count Target</label>
                  <input
                    type="number"
                    value={preferences.default_task_goal}
                    onChange={(e) => handleUpdatePref('default_task_goal', parseInt(e.target.value) || 5)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Default Daily XP Target</label>
                  <input
                    type="number"
                    value={preferences.default_xp_goal}
                    onChange={(e) => handleUpdatePref('default_xp_goal', parseInt(e.target.value) || 100)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Default Monthly Budget Target</label>
                  <input
                    type="number"
                    value={preferences.default_budget_goal}
                    onChange={(e) => handleUpdatePref('default_budget_goal', parseFloat(e.target.value) || 5000)}
                    className="input-glass w-full px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Goal Difficulty</h4>
                    <p className="text-[10px] text-slate-500">Easy (70%), Medium (100%), Hard (130%), Adaptive (autoscale based on history).</p>
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
                <h3 className="text-sm font-bold text-white mb-1">Notification Categories</h3>
                <p className="text-[11px] text-slate-500">Manage popups, reminder times, and sounds.</p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { key: 'notify_xp', label: 'XP Gained', desc: 'Alert when claiming or earning XP points.' },
                  { key: 'notify_level_up', label: 'Level Ups', desc: 'Banner toast when rising to next character level.' },
                  { key: 'notify_achievements', label: 'Achievements Unlocks', desc: 'Congratulatory notification for custom achievements.' },
                  { key: 'notify_badges', label: 'Badges Claimed', desc: 'Notification on unlocking collectible stickers.' },
                  { key: 'notify_recurring_expenses', label: 'Recurring Bills Due', desc: 'Notify upcoming/overdue subscription events.' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                    <div>
                      <h4 className="font-bold text-white">{n.label}</h4>
                      <p className="text-[10px] text-slate-500">{n.desc}</p>
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
                <h3 className="text-sm font-bold text-white mb-1">Finance Settings</h3>
                <p className="text-[11px] text-slate-500">Configure currency tags, spending limits, and week starters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Preferred Currency Symbol</label>
                  <select
                    value={preferences.currency}
                    onChange={(e) => handleUpdatePref('currency', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-white"
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Week Starts On</label>
                  <select
                    value={preferences.week_start_day}
                    onChange={(e) => handleUpdatePref('week_start_day', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-white"
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
                <h3 className="text-sm font-bold text-white mb-1">Analytics View Styles</h3>
                <p className="text-[11px] text-slate-500">Customize charting parameters and default formats.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Preferred Time Format</label>
                  <select
                    value={preferences.preferred_time_format}
                    onChange={(e) => handleUpdatePref('preferred_time_format', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-white"
                  >
                    <option value="12h">12-Hour (AM/PM)</option>
                    <option value="24h">24-Hour Military</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 mb-1 block">Preferred Date Format</label>
                  <select
                    value={preferences.preferred_date_format}
                    onChange={(e) => handleUpdatePref('preferred_date_format', e.target.value)}
                    className="input-glass w-full px-3 py-2 text-white"
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
                <h3 className="text-sm font-bold text-white mb-1">Accessibility Toggles</h3>
                <p className="text-[11px] text-slate-500">Enable helpers to improve viewing contrast and support keyboard loops.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">High Contrast Colors</h4>
                    <p className="text-[10px] text-slate-500">Boosts borders and highlights text values to aid readers.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.high_contrast}
                    onChange={(e) => handleUpdatePref('high_contrast', e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Keyboard Hotkey Navigation</h4>
                    <p className="text-[10px] text-slate-500">Enables logical focus focus outline highlights.</p>
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
                <h3 className="text-sm font-bold text-white mb-1">Backup & Exports Center</h3>
                <p className="text-[11px] text-slate-500">Download your transactions, tasks, logs, and state parameters locally.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white/2 rounded-xl border border-white/5 text-center">
                  <Download size={24} className="mx-auto mb-2 text-purple-400" />
                  <h4 className="font-bold text-white mb-1">Export Data</h4>
                  <p className="text-[10px] text-slate-500 mb-3">Download complete JSON state parameters or CSV files.</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={handleExportJSON} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 font-semibold rounded-lg border border-purple-500/30 hover:bg-purple-500/30">
                      JSON
                    </button>
                    <button onClick={handleExportCSV} className="px-3 py-1.5 bg-slate-900 text-slate-400 font-semibold rounded-lg border border-white/5 hover:bg-slate-800 hover:text-white">
                      CSV
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/2 rounded-xl border border-white/5 text-center">
                  <Upload size={24} className="mx-auto mb-2 text-cyan-400" />
                  <h4 className="font-bold text-white mb-1">Restore State</h4>
                  <p className="text-[10px] text-slate-500 mb-3">Select and upload a previously generated backup JSON file.</p>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 font-semibold rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30"
                  >
                    Upload JSON
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Profile Control</h3>
                <p className="text-[11px] text-slate-500">Edit account variables or securely sign out.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-400 mb-1 block">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-glass w-full px-3 py-2 text-white"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-400 mb-1 block">Avatar URL</label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="input-glass w-full px-3 py-2 text-white"
                      placeholder="e.g. https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold rounded-xl hover:bg-purple-500/30 flex items-center gap-1.5"
                  >
                    <Save size={14} /> Update Profile
                  </button>
                </div>

                <hr className="border-white/5 my-4" />

                <div>
                  <h4 className="font-bold text-white mb-2">Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-slate-900 text-slate-300 font-semibold rounded-xl border border-white/5 hover:bg-slate-800 hover:text-white flex items-center gap-1.5"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-500/30 hover:bg-red-500/30 flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 10: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">About FocusForge</h3>
                <p className="text-[11px] text-slate-500">Licenses, developer coordinates, and system metrics.</p>
              </div>

              <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-3 text-xs text-slate-400">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Application Version</span>
                  <span className="font-bold text-white">v1.1.2-beta</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Developer Team</span>
                  <span className="font-bold text-white">FocusForge Contributors</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Core Libraries</span>
                  <span className="font-bold text-white">React, TypeScript, TailwindCSS, Zustand</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Database Hosting</span>
                  <span className="font-bold text-white">Supabase Cloud PostgreSQL</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
