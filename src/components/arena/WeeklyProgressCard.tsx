import React, { useState } from 'react';
import { Target, Flame, Clock, CheckCircle2, TrendingUp, Zap, Info } from 'lucide-react';
import { ArenaScore } from '../../types/arena';
import ArenaScoreBreakdown from './ArenaScoreBreakdown';

interface WeeklyProgressCardProps {
  userScore: ArenaScore | null;
  streak: number;
}

function WeeklyProgressCard({ userScore, streak }: WeeklyProgressCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const currentScore = userScore?.arena_score || 0;
  const targetScore = Math.ceil((currentScore + 250) / 250) * 250;
  const progressPct = Math.min(100, Math.round((currentScore / targetScore) * 100));
  const focusMinutes = userScore?.focus_minutes || 0;
  const tasksCompleted = userScore?.tasks_completed || 0;

  return (
    <div className="glass-card p-6 mb-8 text-left transition-all duration-300">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Target size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
            Weekly Competition Progress
          </h3>
        </div>

        <button
          onClick={() => setShowBreakdown(true)}
          className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-semibold text-xs transition border border-purple-500/30 flex items-center gap-1.5 touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <Info size={14} /> Score Breakdown
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">Current Score: {currentScore} pts</span>
          <span className="text-purple-300">{progressPct}% achieved</span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-500 rounded-full shadow-lg shadow-purple-500/30"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        <div className="p-3 bg-slate-900/40 rounded-xl text-center border border-slate-800/60">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Clock size={13} className="text-cyan-400" /> Focus Time
          </div>
          <div className="text-base font-bold text-slate-100 font-mono">{focusMinutes}m</div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl text-center border border-slate-800/60">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 size={13} className="text-emerald-400" /> Tasks Done
          </div>
          <div className="text-base font-bold text-slate-100 font-mono">{tasksCompleted}</div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl text-center border border-slate-800/60">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Flame size={13} className="text-amber-400" /> Day Streak
          </div>
          <div className="text-base font-bold text-slate-100 font-mono">{streak} days</div>
        </div>
      </div>

      {/* Arena Score Breakdown Modal */}
      <ArenaScoreBreakdown
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        userScore={userScore}
      />
    </div>
  );
}

export default React.memo(WeeklyProgressCard);
