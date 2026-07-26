import React from 'react';
import { HallOfFameEntry } from '../../types/hallOfFame';
import { Crown, Trophy, Calendar, ChevronRight, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '../../store/useStore';

interface HallOfFamePreviewProps {
  entries: HallOfFameEntry[];
  loading?: boolean;
}

function HallOfFamePreview({ entries, loading }: HallOfFamePreviewProps) {
  const { setPage } = useStore();
  const displayEntries = entries.slice(0, 5);

  return (
    <div className="glass-card p-5 sm:p-6 mb-8 text-left">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Crown size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
              Hall of Fame Champions
            </h3>
            <p className="text-xs text-slate-400">Historical record of past weekly & monthly league winners.</p>
          </div>
        </div>

        <button
          onClick={() => setPage('arena-hall-of-fame')}
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1 touch-target"
        >
          View Full History <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">Loading Hall of Fame history...</div>
      ) : displayEntries.length === 0 ? (
        <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-400">Competition starts soon!</p>
          <p className="text-[11px]">The first Hall of Fame champion will be enshrined at the end of the current period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayEntries.map((entry) => {
            const winnerName = entry.winner_username || entry.winner_profile?.display_name || 'Champion';
            const periodLabel = entry.period_type === 'weekly' ? 'Weekly Champion' : 'Monthly Champion';
            const dateStr = entry.period_start ? format(parseISO(entry.period_start), 'MMM d, yyyy') : '';

            return (
              <div
                key={entry.id}
                className="p-3.5 bg-gradient-to-b from-amber-500/10 to-slate-900/80 rounded-xl border border-amber-500/30 flex items-center gap-3 hover:border-amber-400/60 transition shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-lg shadow-amber-500/20">
                  {winnerName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Crown size={12} className="text-amber-400 shrink-0" />
                    <h4 className="text-xs font-bold text-amber-200 truncate">{winnerName}</h4>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{periodLabel} • {dateStr}</div>
                  <div className="text-xs font-black text-amber-300 font-mono mt-1">{entry.arena_score} pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(HallOfFamePreview);
