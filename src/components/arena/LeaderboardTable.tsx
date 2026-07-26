import React from 'react';
import { ArenaScore } from '../../types/arena';
import { Flame, ArrowUp, ArrowDown, Minus, ShieldCheck, Zap } from 'lucide-react';

interface LeaderboardTableProps {
  leaderboard: ArenaScore[];
  currentUserId?: string;
}

function LeaderboardTable({ leaderboard, currentUserId }: LeaderboardTableProps) {
  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-5 sm:p-6 mb-8 overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
            Full Participant Rankings
          </h3>
          <p className="text-xs text-slate-400">Live points breakdown based on focus sessions and daily consistency.</p>
        </div>
        <span className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 font-bold">
          {leaderboard.length} Contenders
        </span>
      </div>

      {/* Table Container */}
      <div className="table-responsive-scroll rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-2 w-12 text-center">Trend</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4 text-center">Level</th>
              <th className="py-3 px-4 text-right">Arena Score</th>
              <th className="py-3 px-4 text-center">Streak</th>
              <th className="py-3 px-4 text-center">Activity Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {leaderboard.map((row) => {
              const isCurrentUser = row.user_id === currentUserId;
              const displayName = row.user_profile?.display_name || 'Participant';
              const level = Math.floor(Math.sqrt((row.user_profile?.xp || 0) / 100)) + 1;
              const streak = row.user_profile?.streak || 0;
              const rank = row.rank || '-';

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    isCurrentUser
                      ? 'bg-purple-500/15 font-bold border-l-4 border-l-purple-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4 text-center font-extrabold text-sm">
                    {rank === 1 ? (
                      <span className="text-amber-400 font-black">#1 👑</span>
                    ) : rank === 2 ? (
                      <span className="text-slate-300 font-black">#2</span>
                    ) : rank === 3 ? (
                      <span className="text-amber-600 font-black">#3</span>
                    ) : (
                      <span className="text-slate-400">#{rank}</span>
                    )}
                  </td>

                  {/* Trend Indicator */}
                  <td className="py-3.5 px-2 text-center">
                    {rank === 1 ? (
                      <span className="text-emerald-400 text-[10px] font-bold inline-flex items-center gap-0.5"><ArrowUp size={12} /></span>
                    ) : typeof rank === 'number' && rank % 2 === 0 ? (
                      <span className="text-slate-500 text-[10px]"><Minus size={12} /></span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] font-bold inline-flex items-center gap-0.5"><ArrowUp size={12} /></span>
                    )}
                  </td>

                  {/* Participant Avatar & Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow">
                        {displayName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className={`truncate block text-xs ${isCurrentUser ? 'text-purple-300 font-black' : 'text-slate-200 font-bold'}`}>
                          {displayName} {isCurrentUser && <span className="text-[10px] font-normal text-purple-400 ml-1">(You)</span>}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Level Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                      Lvl {level}
                    </span>
                  </td>

                  {/* Arena Score */}
                  <td className="py-3.5 px-4 text-right font-black text-sm text-slate-100 font-mono">
                    {row.arena_score}
                  </td>

                  {/* Streak */}
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Flame size={13} /> {streak}d
                    </span>
                  </td>

                  {/* Activity Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(LeaderboardTable);
