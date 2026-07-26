import React from 'react';
import { Crown, Trophy, Award, Flame, Star, Sparkles } from 'lucide-react';
import { ArenaScore } from '../../types/arena';

interface WeeklyChampionCardProps {
  championScore: ArenaScore | null;
  currentUserId?: string;
}

function WeeklyChampionCard({ championScore, currentUserId }: WeeklyChampionCardProps) {
  if (!championScore) return null;

  const isCurrentWinner = championScore.user_id === currentUserId;
  const displayName = championScore.user_profile?.display_name || 'Arena Champion';
  const score = championScore.arena_score;
  const streak = championScore.user_profile?.streak || 0;

  return (
    <div className="glass-card p-6 mb-8 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-pink-500/15 border-amber-500/30 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-amber-500/30 shrink-0 relative">
            <Crown size={20} className="absolute -top-2 -right-2 text-amber-300 animate-bounce" />
            {displayName[0].toUpperCase()}
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-[10px] border border-amber-400/30 uppercase tracking-wider flex items-center gap-1">
                <Crown size={12} /> Arena Champion
              </span>
              {isCurrentWinner && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                  🎉 You Are Leading!
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
              {displayName}
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              Current Period Leader — Highest Focus & Productivity Points.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 text-center shrink-0 w-full sm:w-auto shadow-lg">
          <div className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">Champion Score</div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">{score} pts</div>
          <div className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center justify-center gap-1">
            <Flame size={13} className="text-amber-400" /> {streak} day streak
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WeeklyChampionCard);
