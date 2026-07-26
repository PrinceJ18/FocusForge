import React from 'react';
import { ArenaScore } from '../../types/arena';
import { Shield, Trophy, ArrowUp, Zap, Target, Award, Flame } from 'lucide-react';
import { calculatePercentile, calculateDistanceToNextRank } from '../../lib/arena';

interface YourPositionCardProps {
  userScore: ArenaScore | null;
  leaderboard: ArenaScore[];
}

function YourPositionCard({ userScore, leaderboard }: YourPositionCardProps) {
  if (!userScore && leaderboard.length === 0) return null;

  // Calculate rank from leaderboard or score
  const rank = userScore?.rank || (leaderboard.findIndex(item => item.user_id === userScore?.user_id) + 1) || 1;
  const rankNum = typeof rank === 'number' ? rank : 1;
  const score = userScore?.arena_score || 0;
  const totalCount = leaderboard.length || 1;

  // Use single source of truth engine functions
  const percentile = calculatePercentile(rankNum, totalCount);
  const distanceToNextRank = calculateDistanceToNextRank(score, rankNum, leaderboard);

  return (
    <div className="glass-card p-6 mb-8 border-purple-500/30 relative overflow-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
              Your Arena Performance
            </h3>
            <p className="text-xs text-slate-400">Personal competition breakdown for this period.</p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black border border-purple-500/30 flex items-center gap-1.5 self-start sm:self-auto">
          <Zap size={14} className="text-amber-400" /> Top {percentile}% Contender
        </div>
      </div>

      {/* Grid of position metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current Rank */}
        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Rank</div>
          <div className="text-xl font-black text-amber-300 mt-1">#{rank}</div>
        </div>

        {/* Arena Score */}
        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Arena Score</div>
          <div className="text-xl font-black text-purple-300 font-mono mt-1">{score}</div>
        </div>

        {/* Distance to Next Rank */}
        <div className="p-[14px] bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Rank Gap</div>
          <div className="text-xl font-black text-cyan-300 mt-1">
            {distanceToNextRank > 0 ? `+${distanceToNextRank} pts` : 'Top Rank! 👑'}
          </div>
        </div>

        {/* Best Rank Ever */}
        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Best Rank Ever</div>
          <div className="text-xl font-black text-emerald-300 mt-1">#1</div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(YourPositionCard);
