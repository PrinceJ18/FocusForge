import React, { useState, useMemo } from 'react';
import {
  Trophy, Zap, Flame, Award, Star, Activity, Map, Sparkles,
  Search, Filter, Calendar, DollarSign, ArrowRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, parseISO, isWithinInterval, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { getLevelInfo } from '../lib/levels';
import { ACHIEVEMENTS, MILESTONES } from '../lib/events';
import { ALL_BADGES } from '../lib/statsUtils';

export default function Achievements() {
  const { expenses, tasks, focusSessions, savingsGoals, profile, user, events } = useStore();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'focus' | 'finance' | 'tasks' | 'xp' | 'achievements' | 'reports'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Stats calculation
  const totalFocusSessions = useMemo(() => focusSessions.reduce((sum, s) => sum + (s.sessions_count || 1), 0), [focusSessions]);
  const totalFocusMinutes = useMemo(() => focusSessions.reduce((sum, s) => sum + s.minutes, 0), [focusSessions]);
  const totalFocusHours = useMemo(() => +(totalFocusMinutes / 60).toFixed(1), [totalFocusMinutes]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalExpensesCount = useMemo(() => expenses.length, [expenses]);
  const totalSavings = useMemo(() => savingsGoals.reduce((sum, g) => sum + g.current_amount, 0), [savingsGoals]);

  const levelInfo = useMemo(() => getLevelInfo(profile.xp), [profile.xp]);

  const joinDate = useMemo(() => {
    if (user?.created_at) {
      return format(new Date(user.created_at), 'MMMM yyyy');
    }
    return format(new Date(), 'MMMM yyyy');
  }, [user]);

  const daysActive = useMemo(() => {
    if (!user?.created_at) return 1;
    const diff = new Date().getTime() - new Date(user.created_at).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [user]);

  // Derived timeline events (Section 2: Key Milestones)
  const keyTimelineEvents = useMemo(() => {
    const list: Array<{ title: string; date: string; icon: string; desc: string; type: string }> = [];

    // Let's check first focus session
    const sortedSessions = [...focusSessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
    if (sortedSessions.length > 0) {
      list.push({
        title: 'First Focus Session',
        date: sortedSessions[0].session_date,
        icon: '🎯',
        desc: 'Started your focus journey!',
        type: 'focus'
      });
    }

    // Level gains
    const levelEvents = events.filter(e => e.type === 'level_up');
    levelEvents.forEach(e => {
      list.push({
        title: `Reached Level ${e.metadata.level}`,
        date: e.timestamp.slice(0, 10),
        icon: '👑',
        desc: `Leveled up to Level ${e.metadata.level}!`,
        type: 'level'
      });
    });

    // Badge gains
    const badgeEvents = events.filter(e => e.type === 'badge_earned' || e.type === 'badge_unlocked');
    badgeEvents.forEach(e => {
      list.push({
        title: `Badge Earned: ${e.metadata.badgeName || 'New Badge'}`,
        date: e.timestamp.slice(0, 10),
        icon: '🏆',
        desc: e.metadata.description || 'Earned a new badge',
        type: 'badge'
      });
    });

    // Achievements unlocked
    const achEvents = events.filter(e => e.type === 'achievement_unlocked');
    achEvents.forEach(e => {
      list.push({
        title: `Achievement: ${e.metadata.achievementTitle || 'Unlocked'}`,
        date: e.timestamp.slice(0, 10),
        icon: '⭐',
        desc: e.metadata.description || 'Unlocked a major achievement!',
        type: 'achievement'
      });
    });

    // First task
    const completedTasksList = [...tasks].filter(t => t.completed && t.completed_at).sort((a, b) => (a.completed_at || '').localeCompare(b.completed_at || ''));
    if (completedTasksList.length > 0) {
      list.push({
        title: 'First Task Completed',
        date: (completedTasksList[0].completed_at || '').slice(0, 10),
        icon: '✅',
        desc: `Completed: ${completedTasksList[0].title}`,
        type: 'tasks'
      });
    }

    // First expense
    const sortedExpenses = [...expenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
    if (sortedExpenses.length > 0) {
      list.push({
        title: 'Budget Keeper Spark',
        date: sortedExpenses[0].expense_date,
        icon: '💰',
        desc: `Logged first expense: ${sortedExpenses[0].title}`,
        type: 'finance'
      });
    }

    // Daily challenge / Goals completed
    const goalEvents = events.filter(e => e.type === 'daily_goals_completed');
    goalEvents.forEach(e => {
      list.push({
        title: 'Daily Goals Completed',
        date: e.timestamp.slice(0, 10),
        icon: '🔥',
        desc: 'Completed all focus & budget daily tasks!',
        type: 'goals'
      });
    });

    // Sort chronologically (descending for presentation, or ascending - prompt shows July 2 -> July 25, which is ascending)
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, focusSessions, tasks, expenses]);

  // Section 3: XP Events
  const xpEvents = useMemo(() => {
    return events.filter(e => e.type === 'xp_earned' || e.category === 'xp');
  }, [events]);

  // Section 4: Level History
  const levelHistory = useMemo(() => {
    return events.filter(e => e.type === 'level_up' || e.category === 'levels');
  }, [events]);

  // Section 5: Badge Collection mapping
  const badgeCollection = useMemo(() => {
    const earnedBadgeEvents = events.filter(e => e.type === 'badge_earned' || e.type === 'badge_unlocked');
    return ALL_BADGES.map(badge => {
      const unlockEvent = earnedBadgeEvents.find(e => e.metadata.badgeId === badge.id);
      // Fallback: check profile badges array
      const profileBadge = profile.badges.find(b => b.id === badge.id);
      const isUnlocked = !!unlockEvent || !!profileBadge;
      const unlockedAt = unlockEvent ? unlockEvent.timestamp : (profileBadge ? profileBadge.unlockedAt : null);
      
      // Categorize
      let category = 'Special Events';
      if (badge.id.includes('focus')) category = 'Focus';
      else if (badge.id.includes('streak')) category = 'Streak';
      else if (badge.id.includes('xp')) category = 'Rewards';
      else if (badge.id.includes('task')) category = 'Tasks';
      else if (badge.id.includes('budget') || badge.id.includes('save')) category = 'Finance';

      return {
        ...badge,
        category,
        isUnlocked,
        unlockedAt,
        howEarned: badge.desc,
      };
    });
  }, [events, profile.badges]);

  // Section 6: Achievements mapping
  const achievements = useMemo(() => {
    const unlockedAchEvents = events.filter(e => e.type === 'achievement_unlocked');
    const statsObj = {
      totalFocusSessions,
      totalFocusMinutes,
      completedTasks,
      totalExpensesCount,
      totalSavings,
      longestStreak: Math.max(profile.streak || 0, 1),
      currentLevel: levelInfo.level,
      daysActive,
      totalXP: profile.xp,
    };

    return ACHIEVEMENTS.map(ach => {
      const unlockEvent = unlockedAchEvents.find(e => e.metadata.achievementId === ach.id);
      const curVal = ach.currentValue(statsObj);
      const progressPercent = Math.min(100, Math.floor((curVal / ach.targetValue) * 100));
      return {
        ...ach,
        currentVal: curVal,
        progressPercent,
        isUnlocked: !!unlockEvent || curVal >= ach.targetValue,
        unlockedAt: unlockEvent ? unlockEvent.timestamp : null,
      };
    });
  }, [events, totalFocusSessions, totalFocusMinutes, completedTasks, totalExpensesCount, totalSavings, profile.streak, levelInfo.level, daysActive, profile.xp]);

  // Productivity Score logic (Single Source of Truth helper from Dashboard.tsx stats)
  const productivityScore = useMemo(() => {
    const taskScore = completedTasks > 0 ? Math.min(40, (completedTasks / Math.max(1, tasks.length)) * 40) : 0;
    const focusScore = totalFocusMinutes > 0 ? Math.min(40, (totalFocusMinutes / 60) * 2) : 0;
    const streakScore = Math.min(20, profile.streak * 2);
    return Math.round(taskScore + focusScore + streakScore);
  }, [completedTasks, tasks.length, totalFocusMinutes, profile.streak]);

  // General Filter & Search logic for Activities / Events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const typeMatch = event.type.toLowerCase().includes(query);
        const catMatch = event.category.toLowerCase().includes(query);
        const descMatch = (event.metadata.description || '').toLowerCase().includes(query);
        const titleMatch = (event.metadata.title || event.metadata.badgeName || event.metadata.achievementTitle || '').toLowerCase().includes(query);
        if (!typeMatch && !catMatch && !descMatch && !titleMatch) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && event.category !== categoryFilter) {
        return false;
      }

      // 3. Time Filter
      if (timeFilter !== 'all') {
        const evDate = parseISO(event.timestamp);
        const now = new Date();
        let start = now;

        if (timeFilter === 'today') {
          start = subDays(now, 1);
        } else if (timeFilter === 'week') {
          start = startOfWeek(now);
        } else if (timeFilter === 'month') {
          start = startOfMonth(now);
        } else if (timeFilter === 'year') {
          start = startOfYear(now);
        }

        if (!isWithinInterval(evDate, { start, end: now })) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, categoryFilter, timeFilter]);

  return (
    <div className="space-y-12 pb-16 page-enter" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* SECTION 1: Profile Summary */}
      <section className="glass-card p-6 md:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(16,12,30,0.8), rgba(26,16,48,0.7))', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '24px' }}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 z-10 relative">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-extrabold relative shadow-[0_0_30px_rgba(168,85,247,0.35)]" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white' }}>
              {(profile.display_name || user?.email || 'U')[0].toUpperCase()}
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-black rounded-full px-2 py-0.5 border-2 border-slate-950">
                Lvl {levelInfo.level}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black gradient-text tracking-tight mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                {profile.display_name || user?.email?.split('@')[0] || 'Explorer'}
              </h1>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Member Since: {joinDate}
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400">
                  <Flame size={12} className="fill-orange-400" />
                  Streak: {profile.streak} Days
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Zap size={12} className="fill-purple-400" />
                  {profile.xp} Total XP
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Award size={12} />
                  {badgeCollection.filter(b => b.isUnlocked).length} Badges
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 flex flex-col gap-4 bg-slate-950/40 p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span style={{ color: 'var(--text-secondary)' }}>XP PROGRESS TO LEVEL {levelInfo.level + 1}</span>
              <span className="text-purple-400">{levelInfo.progress} / 100 XP</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/5">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${levelInfo.progress}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center p-3 bg-white/2 rounded-xl border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Productivity Score</div>
                <div className="text-2xl font-black text-cyan-400">{productivityScore}</div>
              </div>
              <div className="text-center p-3 bg-white/2 rounded-xl border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Achievements</div>
                <div className="text-2xl font-black text-pink-400">{achievements.filter(a => a.isUnlocked).length} / {achievements.length}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS BAR */}
      <section className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderRadius: '16px' }}>
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Achievements, Badges, XP..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:bg-white/10 text-white placeholder-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <Filter size={14} /> Filters:
          </div>
          <select
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            value={categoryFilter}
            onChange={(e: any) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="focus">Focus</option>
            <option value="finance">Finance</option>
            <option value="tasks">Tasks</option>
            <option value="xp">XP Logs</option>
            <option value="achievements">Achievements</option>
            <option value="reports">Reports</option>
          </select>
          <select
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            value={timeFilter}
            onChange={(e: any) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </section>

      {/* GRID LAYOUT FOR VARIOUS TIMELINES AND SECTION PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: SECTION 2 (Achievement Timeline) & SECTION 10 (Journey Map) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 2: Achievement Timeline */}
          <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              Key Milestones Timeline
            </h2>
            {keyTimelineEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No milestones logged yet. Keep focusing!</div>
            ) : (
              <div className="relative pl-6 border-l border-purple-500/20 space-y-6 ml-2">
                {keyTimelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    {/* Circle Dot */}
                    <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-purple-500 flex items-center justify-center group-hover:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    </div>
                    {/* Event Box */}
                    <div className="glass-card p-4 hover:border-purple-500/40 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{evt.type}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {evt.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{evt.icon}</span>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{evt.title}</h4>
                          <p className="text-xs text-slate-400">{evt.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 10: Journey Map */}
          <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Map className="text-cyan-400" size={20} />
              Your Journey Roadmap
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-950/30 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold border border-purple-500/40">
                  {levelInfo.level}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Current Level: {levelInfo.level}</div>
                  <div className="text-xs text-slate-400">Title: {levelInfo.title}</div>
                </div>
              </div>
              
              <div className="flex-1 w-full flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progress to Level {levelInfo.level + 1}</span>
                  <span>{levelInfo.progress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${levelInfo.progress}%` }} />
                </div>
                <div className="text-right text-[10px] text-slate-500">{levelInfo.xpToNext} XP needed to Level Up</div>
              </div>

              <div className="flex items-center gap-3">
                <ArrowRight className="text-purple-500 hidden md:block" />
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-lg font-bold border border-white/10 text-slate-500">
                  {levelInfo.level + 1}
                </div>
              </div>
            </div>

            {/* Upcoming Goals in Roadmap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 flex gap-3.5">
                <div className="text-2xl text-purple-400 font-bold">🏆</div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-0.5">Next Badge Goal</h4>
                  <div className="text-sm font-semibold text-white">
                    {badgeCollection.find(b => !b.isUnlocked)?.name || 'All Badges Unlocked!'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {badgeCollection.find(b => !b.isUnlocked)?.desc || 'Perfect Focus'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 flex gap-3.5">
                <div className="text-2xl text-pink-400 font-bold">⭐</div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-0.5">Next Achievement</h4>
                  <div className="text-sm font-semibold text-white">
                    {achievements.find(a => !a.isUnlocked)?.title || 'All Achievements Completed!'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Progress: {achievements.find(a => !a.isUnlocked)?.progressPercent || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SECTION 8 (Milestones) & SECTION 9 (Statistics) */}
        <div className="space-y-8">
          
          {/* SECTION 8: Milestones */}
          <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-pink-400" size={20} />
              Important Milestones
            </h2>
            <div className="space-y-4">
              {MILESTONES.map((mile) => {
                const statsObj = {
                  totalFocusSessions,
                  totalFocusMinutes,
                  completedTasks,
                  totalExpensesCount,
                  totalSavings,
                  longestStreak: Math.max(profile.streak || 0, 1),
                  daysActive,
                  totalXP: profile.xp,
                };
                const curVal = mile.currentValue(statsObj);
                const isReached = curVal >= mile.targetValue;
                const progressPct = Math.min(100, Math.floor((curVal / mile.targetValue) * 100));

                return (
                  <div key={mile.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between gap-3 hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-lg">
                        {mile.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{mile.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{mile.description}</p>
                        {/* Progress Bar */}
                        <div className="w-32 bg-slate-950 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="bg-pink-500 h-full" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isReached ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'}`}>
                      {isReached ? 'Reached' : `${progressPct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 9: Statistics Overview */}
          <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} />
              Statistics Overview
            </h2>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Total XP Accumulated</span>
                <span className="text-xs font-bold text-white">{profile.xp} XP</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Badges Unlocked</span>
                <span className="text-xs font-bold text-white">{badgeCollection.filter(b => b.isUnlocked).length} / {badgeCollection.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Achievements Completed</span>
                <span className="text-xs font-bold text-white">{achievements.filter(a => a.isUnlocked).length} / {achievements.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Total Focus Time</span>
                <span className="text-xs font-bold text-white">{totalFocusHours} Hours</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Completed Tasks</span>
                <span className="text-xs font-bold text-white">{completedTasks}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Expenses Logged</span>
                <span className="text-xs font-bold text-white">{totalExpensesCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Current / Longest Streak</span>
                <span className="text-xs font-bold text-white">{profile.streak} / {Math.max(profile.streak, 1)} Days</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-400">Active Member</span>
                <span className="text-xs font-bold text-white">{daysActive} Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Badge Collection */}
      <section className="glass-card p-6 md:p-8" style={{ borderRadius: '24px' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Award className="text-purple-400" size={24} />
              Badge Collection
            </h2>
            <p className="text-xs text-slate-400 mt-1">Unlock badges by using focus, tracking expenses, and finishing tasks.</p>
          </div>
          <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-400">
            Completion: {Math.floor((badgeCollection.filter(b => b.isUnlocked).length / badgeCollection.length) * 100)}%
          </div>
        </div>

        {/* Badge Grid grouped by Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {badgeCollection.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center transition-all duration-300 relative group ${badge.isUnlocked ? 'bg-white/2 border-white/10 hover:border-purple-500/40 hover:-translate-y-1' : 'bg-slate-900/40 border-white/5 opacity-55'}`}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-3 relative shadow-inner"
                style={{
                  background: badge.isUnlocked ? `linear-gradient(135deg, ${badge.color || '#a855f7'}, #101020)` : 'rgba(255,255,255,0.03)',
                  border: badge.isUnlocked ? `1px solid ${badge.color || '#a855f7'}` : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                {badge.icon}
                {!badge.isUnlocked && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-sm">🔒</div>}
              </div>
              <h4 className="text-xs font-bold text-slate-200 mb-1">{badge.name}</h4>
              <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{badge.desc}</p>
              
              {/* Tooltip detail */}
              <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-950 border border-white/10 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none text-left shadow-2xl">
                <div className="text-xs font-bold text-white mb-1">{badge.name}</div>
                <div className="text-[10px] text-slate-400 mb-2">{badge.desc}</div>
                <div className="text-[10px] border-t border-white/5 pt-1.5 flex flex-col gap-1">
                  <span className="text-purple-400 font-semibold uppercase tracking-wider text-[9px]">{badge.category}</span>
                  {badge.isUnlocked ? (
                    <span className="text-green-400">Unlocked: {badge.unlockedAt ? format(new Date(badge.unlockedAt), 'MMM d, h:mm a') : 'Legacy'}</span>
                  ) : (
                    <span className="text-slate-500">Requirements: {badge.desc}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: Achievements */}
      <section className="glass-card p-6 md:p-8" style={{ borderRadius: '24px' }}>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <Trophy className="text-yellow-400" size={24} />
          Long-Term Achievements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((ach) => (
            <div key={ach.id} className="p-5 bg-white/2 rounded-2xl border border-white/5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-300">
              {ach.isUnlocked && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg">
                  Unlocked
                </div>
              )}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {ach.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{ach.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-300">{ach.currentVal} / {ach.targetValue}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5">
                  <div className="bg-yellow-500 h-full rounded-full transition-all duration-500" style={{ width: `${ach.progressPercent}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs text-slate-400">
                <span>Reward: <strong className="text-yellow-500">+{ach.xpReward} XP</strong></span>
                {ach.isUnlocked && ach.unlockedAt && (
                  <span className="text-[10px] text-slate-500">{format(new Date(ach.unlockedAt), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GRID FOR XP HISTORY & LEVEL HISTORY & ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION 3: XP History */}
        <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="text-purple-400" size={18} />
            XP Log History
          </h2>
          {xpEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No XP earned logs yet.</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {xpEvents.slice(0, 15).map((e) => (
                <div key={e.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between text-xs hover:bg-white/5 transition-all">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-200">
                      {e.type === 'xp_earned' ? (e.metadata.description || 'Action Completed') : e.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {format(new Date(e.timestamp), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <span className="font-extrabold text-purple-400">
                    +{e.metadata.xpEarned || e.metadata.amount || 10} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: Level History */}
        <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="text-yellow-500" size={18} />
            Level History
          </h2>
          {levelHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Unlock Level up events to populate!</div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {levelHistory.map((e, idx) => (
                <div key={e.id || idx} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-yellow-500 uppercase">Level {e.metadata.level || 2}</span>
                    <span className="text-[9px] text-slate-500">{format(new Date(e.timestamp), 'MMM d, yyyy')}</span>
                  </div>
                  <p className="text-xs text-slate-300">Congratulations message logged dynamically!</p>
                  <p className="text-[10px] text-slate-500 mt-1">Crossed {(e.metadata.level || 2) * 100 - 100} XP milestones.</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: Activity Timeline */}
        <div className="glass-card p-6" style={{ borderRadius: '20px' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="text-cyan-400" size={18} />
            Complete Activity Log
          </h2>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No activity events found matching criteria.</div>
          ) : (
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-2">
              {filteredEvents.slice(0, 30).map((e) => (
                <div key={e.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex gap-3 hover:bg-white/5 transition-all text-xs">
                  <div className="text-lg">
                    {e.category === 'focus' ? '🧠' : e.category === 'finance' ? '💰' : e.category === 'tasks' ? '✅' : '⚡'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-semibold text-slate-200 uppercase text-[10px] tracking-wider text-purple-400">{e.category}</span>
                      <span className="text-[9px] text-slate-500">{format(new Date(e.timestamp), 'h:mm a')}</span>
                    </div>
                    <p className="text-xs text-slate-300">{e.metadata.description || e.type.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
