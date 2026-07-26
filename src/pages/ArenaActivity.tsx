import React, { useState, useEffect, useMemo } from 'react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { ArenaActivity } from '../types/activity';
import { Activity, Zap, Flame, Trophy, Award, Star, ArrowLeft, Filter, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { LoadingState } from '../components/ui/Loading';

export default function ArenaActivityPage() {
  const { setPage } = useStore();
  const { activities, loading, error, refresh } = useActivityFeed(50);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filteredActivities = useMemo(() => {
    if (filterPeriod === 'all') return activities;

    return activities.filter((act) => {
      if (!act.created_at) return false;
      const date = parseISO(act.created_at);
      if (filterPeriod === 'today') return isToday(date);
      if (filterPeriod === 'week') return isThisWeek(date, { weekStartsOn: 1 });
      if (filterPeriod === 'month') return isThisMonth(date);
      return true;
    });
  }, [activities, filterPeriod]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'level_up': return <Zap size={18} className="text-purple-400" />;
      case 'personal_best': return <Trophy size={18} className="text-amber-400" />;
      case 'streak': return <Flame size={18} className="text-amber-500" />;
      case 'badge': return <Award size={18} className="text-pink-400" />;
      default: return <Star size={18} className="text-cyan-400" />;
    }
  };

  const getActivityDescription = (act: ArenaActivity) => {
    const name = act.user_profile?.display_name || 'Participant';
    const m = act.metadata || {};

    switch (act.activity_type) {
      case 'level_up':
        return `${name} leveled up to Level ${m.level || 2}! 🎉`;
      case 'personal_best':
        return `${name} set a new Personal Best of ${m.arena_score || m.score_achieved || 500} pts! 🏆`;
      case 'streak':
        return `${name} achieved a ${m.streak_days || 7}-day streak! 🔥`;
      case 'badge':
        return `${name} earned the ${m.badge_name || 'Productivity Badge'}! 🎖️`;
      default:
        return `${name} completed a Daily Arena Challenge! 🚀`;
    }
  };

  return (
    <div className="page-enter space-y-6 text-left">
      {/* HEADER & BACK BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setPage('arena')}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition border border-slate-700/60 touch-target shrink-0"
            title="Back to Arena"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              Arena Activity Feed
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-time public productivity achievements and level progress across Productivity Arena.</p>
          </div>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setFilterPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition touch-target ${filterPeriod === 'all' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilterPeriod('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition touch-target ${filterPeriod === 'today' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilterPeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition touch-target ${filterPeriod === 'week' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilterPeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition touch-target ${filterPeriod === 'month' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* PRIVACY CALLOUT */}
      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-center gap-2">
        <ShieldCheck size={16} className="shrink-0 text-purple-400" />
        <span>Privacy Protected: Only public level-ups, badges, and streaks are shown. Task titles, expenses, and notes are strictly private.</span>
      </div>

      {/* FEED CONTENT */}
      {loading ? (
        <div className="py-16"><LoadingState message="Loading Arena Activity Feed..." /></div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-red-400 glass-card space-y-2">
          <p>{error}</p>
          <button onClick={() => refresh()} className="btn-ghost px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 mt-2">
            <RefreshCcw size={12} /> Retry
          </button>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Activity size={32} className="mx-auto text-purple-400/60 mb-2" />
          <h3 className="text-base font-bold text-slate-200">No Activity Logged</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No public arena achievements logged for the selected time filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              className="glass-card p-4 flex items-center justify-between gap-4 hover:border-purple-500/30 transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-md">
                  {getActivityIcon(act.activity_type)}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-100 truncate">
                    {getActivityDescription(act)}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {act.user_profile?.display_name || 'User'}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 shrink-0 font-medium bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                {act.created_at ? format(parseISO(act.created_at), 'MMM d, yyyy • HH:mm') : 'Recently'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
