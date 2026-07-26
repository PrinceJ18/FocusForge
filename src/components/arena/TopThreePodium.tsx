import React from 'react';
import { ArenaScore } from '../../types/arena';
import { Trophy, Crown, Medal, Award, Flame, Zap } from 'lucide-react';

interface TopThreePodiumProps {
  leaderboard: ArenaScore[];
  currentUserId?: string;
}

function TopThreePodium({ leaderboard, currentUserId }: TopThreePodiumProps) {
  // Extract top 3 participants
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="glass-card p-10 text-center space-y-3 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto text-2xl font-bold">
          🏆
        </div>
        <h3 className="text-base font-bold text-slate-200">No Podium Contenders Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Be the first participant in this period's Productivity Arena leaderboard by logging focus sessions or completing tasks!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 mb-8 overflow-hidden relative transition-all duration-300">
      <div className="text-center mb-8">
        <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          Top Contenders
        </span>
        <h2 className="text-xl font-black text-slate-100 mt-2" style={{ fontFamily: 'Space Grotesk' }}>
          Leaderboard Podium
        </h2>
      </div>

      {/* Podium Cards Grid */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 sm:gap-6 min-h-[300px]">
        {/* SECOND PLACE (#2 SILVER) */}
        <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center">
          {second ? (
            <div className={`w-full p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center relative ${
              second.user_id === currentUserId
                ? 'bg-slate-900/90 border-cyan-400/60 shadow-xl shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-700/60'
            }`}>
              <div className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 flex items-center justify-center font-bold text-xs mb-3 border border-slate-300/40">
                #2
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-xl font-bold text-white shadow-lg mb-3 shrink-0">
                {(second.user_profile?.display_name || 'U')[0].toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-100 truncate w-full">
                {second.user_profile?.display_name || 'User'}
              </h3>
              <div className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                Level {Math.floor(Math.sqrt((second.user_profile?.xp || 0) / 100)) + 1}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 w-full">
                <div className="text-lg font-black text-cyan-300 font-mono">
                  {second.arena_score} <span className="text-[10px] font-normal text-slate-400">pts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
              Silver Spot Open
            </div>
          )}
          <div className="w-full h-12 bg-gradient-to-t from-slate-800/80 to-slate-900/40 rounded-b-xl mt-2 hidden md:block" />
        </div>

        {/* FIRST PLACE (#1 GOLD) */}
        <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center">
          {first ? (
            <div className={`w-full p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center relative ${
              first.user_id === currentUserId
                ? 'bg-slate-900/95 border-amber-400 shadow-2xl shadow-amber-500/25'
                : 'bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900/90 border-amber-500/40 shadow-xl shadow-amber-500/10'
            }`}>
              <Crown size={28} className="text-amber-400 animate-bounce mb-1" />
              <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-xs mb-3 border border-amber-400/50">
                #1
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-amber-500/30 mb-3 shrink-0">
                {(first.user_profile?.display_name || 'U')[0].toUpperCase()}
              </div>
              <h3 className="text-base font-black text-amber-200 truncate w-full">
                {first.user_profile?.display_name || 'User'}
              </h3>
              <div className="text-xs text-amber-400/90 mt-0.5 font-bold">
                Level {Math.floor(Math.sqrt((first.user_profile?.xp || 0) / 100)) + 1}
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 w-full">
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {first.arena_score} <span className="text-xs font-normal text-amber-400/70">pts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-8 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center text-xs text-amber-400">
              Gold Champion Spot Open
            </div>
          )}
          <div className="w-full h-20 bg-gradient-to-t from-amber-500/20 to-amber-500/5 border-x border-t border-amber-500/20 rounded-b-xl mt-2 hidden md:block" />
        </div>

        {/* THIRD PLACE (#3 BRONZE) */}
        <div className="w-full md:w-1/3 order-3 flex flex-col items-center">
          {third ? (
            <div className={`w-full p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center relative ${
              third.user_id === currentUserId
                ? 'bg-slate-900/90 border-amber-700/60 shadow-xl shadow-amber-900/10'
                : 'bg-slate-900/60 border-slate-700/60'
            }`}>
              <div className="w-8 h-8 rounded-full bg-amber-800/20 text-amber-600 flex items-center justify-center font-bold text-xs mb-3 border border-amber-700/40">
                #3
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-xl font-bold text-white shadow-lg mb-3 shrink-0">
                {(third.user_profile?.display_name || 'U')[0].toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-100 truncate w-full">
                {third.user_profile?.display_name || 'User'}
              </h3>
              <div className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                Level {Math.floor(Math.sqrt((third.user_profile?.xp || 0) / 100)) + 1}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 w-full">
                <div className="text-lg font-black text-amber-500 font-mono">
                  {third.arena_score} <span className="text-[10px] font-normal text-slate-400">pts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
              Bronze Spot Open
            </div>
          )}
          <div className="w-full h-8 bg-gradient-to-t from-slate-800/80 to-slate-900/40 rounded-b-xl mt-2 hidden md:block" />
        </div>
      </div>
    </div>
  );
}

export default React.memo(TopThreePodium);
