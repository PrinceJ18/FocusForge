import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useArena } from '../hooks/useArena';
import { hallOfFameService } from '../services/hallOfFameService';
import { HallOfFameEntry } from '../types/hallOfFame';
import { PeriodType } from '../types/arena';
import { Crown, Trophy, Calendar, Search, ArrowLeft, RefreshCcw, Flame, Medal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LoadingState } from '../components/ui/Loading';

export default function ArenaHallOfFamePage() {
  const { setPage } = useStore();
  const { defaultArena } = useArena();

  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHallOfFame = async () => {
    if (!defaultArena?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await hallOfFameService.getHallOfFameEntries(defaultArena.id, periodType, 100);
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load Hall of Fame history:', err);
      setError('Failed to load Hall of Fame archive records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHallOfFame();
  }, [defaultArena?.id, periodType]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      const name = e.winner_username || e.winner_profile?.display_name || '';
      return name.toLowerCase().includes(q);
    });
  }, [entries, searchQuery]);

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
            <h1 className="text-xl sm:text-2xl font-black text-amber-200 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              👑 Hall of Fame Archives
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Historical record of all past weekly & monthly Productivity Arena champions.</p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setPeriodType('weekly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition touch-target ${periodType === 'weekly' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
          >
            Weekly Champions
          </button>
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition touch-target ${periodType === 'monthly' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
          >
            Monthly League Champions
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter champions by username..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-amber-500 transition"
        />
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div className="py-16"><LoadingState message="Loading Hall of Fame archive records..." /></div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-red-400 glass-card space-y-2">
          <p>{error}</p>
          <button onClick={() => fetchHallOfFame()} className="btn-ghost px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 mt-2">
            <RefreshCcw size={12} /> Retry
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Crown size={32} className="mx-auto text-amber-400/60 mb-2" />
          <h3 className="text-base font-bold text-slate-200">No Hall of Fame Records</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'No champion records found matching your search filter.' : 'The first Hall of Fame champion will be enshrined at the end of the current competition period.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const winnerName = entry.winner_username || entry.winner_profile?.display_name || 'Champion';
            const dateStr = entry.period_start ? format(parseISO(entry.period_start), 'MMM d, yyyy') : '';
            const endStr = entry.period_end ? format(parseISO(entry.period_end), 'MMM d, yyyy') : '';

            return (
              <div
                key={entry.id}
                className="glass-card p-5 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900/90 border-amber-500/30 flex flex-col justify-between space-y-4 hover:border-amber-400/60 transition shadow-xl shadow-amber-500/5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center font-black text-white text-lg shrink-0 shadow-lg shadow-amber-500/20 relative">
                    <Crown size={16} className="absolute -top-1.5 -right-1.5 text-amber-300" />
                    {winnerName[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                        {entry.period_type === 'weekly' ? 'Weekly Champion' : 'Monthly Champion'}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-100 truncate mt-1">{winnerName}</h3>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/20 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Period Date</div>
                    <div className="font-semibold text-slate-300 mt-0.5">{dateStr} – {endStr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-amber-400">Champion Score</div>
                    <div className="text-lg font-black text-amber-300 font-mono mt-0.5">{entry.arena_score} pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
