import React from 'react';
import { ArenaActivity } from '../../types/activity';
import { Zap, Award, Flame, Trophy, Star, ChevronRight, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '../../store/useStore';

interface FriendActivityPreviewProps {
  activities: ArenaActivity[];
  loading?: boolean;
}

function FriendActivityPreview({ activities, loading }: FriendActivityPreviewProps) {
  const displayActivities = activities.slice(0, 5);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'level_up': return <Zap size={15} className="text-purple-400" />;
      case 'personal_best': return <Trophy size={15} className="text-amber-400" />;
      case 'streak': return <Flame size={15} className="text-amber-500" />;
      case 'badge': return <Award size={15} className="text-pink-400" />;
      default: return <Star size={15} className="text-cyan-400" />;
    }
  };

  const getActivityText = (act: ArenaActivity) => {
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

  const { setPage } = useStore();

  return (
    <div className="glass-card p-5 sm:p-6 mb-8 text-left">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
              Public Arena Feed
            </h3>
            <p className="text-xs text-slate-400">Recent public milestones and level progress.</p>
          </div>
        </div>

        <button
          onClick={() => setPage('arena-activity')}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition flex items-center gap-1 touch-target"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">Loading feed...</div>
      ) : displayActivities.length === 0 ? (
        <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
          No recent public activity logged yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayActivities.map((act) => (
            <div
              key={act.id}
              className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs hover:border-purple-500/30 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  {getActivityIcon(act.activity_type)}
                </div>
                <span className="text-slate-200 font-medium truncate">{getActivityText(act)}</span>
              </div>

              <span className="text-[10px] text-slate-400 shrink-0">
                {act.created_at ? format(parseISO(act.created_at), 'MMM d, HH:mm') : 'Just now'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(FriendActivityPreview);
