import React, { useEffect, useState } from 'react';
import { PeriodType } from '../../types/arena';
import { Clock, Calendar, Zap } from 'lucide-react';

interface PeriodToggleCountdownProps {
  periodType: PeriodType;
  onChangePeriod: (period: PeriodType) => void;
}

function PeriodToggleCountdown({ periodType, onChangePeriod }: PeriodToggleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      if (periodType === 'weekly') {
        // Calculate remaining time until Sunday 23:59:59
        const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        
        const nextReset = new Date(now);
        nextReset.setDate(now.getDate() + daysUntilSunday);
        nextReset.setHours(23, 59, 59, 999);

        const diffMs = nextReset.getTime() - now.getTime();
        if (diffMs <= 0) {
          setTimeLeft('0d 0h 0m');
          return;
        }

        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diffMs / (1000 * 60)) % 60);

        setTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        // Calculate remaining days in current month
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const daysRemaining = lastDayOfMonth.getDate() - now.getDate();
        setTimeLeft(`${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [periodType]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6 transition-all duration-300">
      {/* Period Segmented Toggle */}
      <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
        <button
          onClick={() => onChangePeriod('weekly')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            periodType === 'weekly'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={14} /> Weekly Competition
        </button>
        <button
          onClick={() => onChangePeriod('monthly')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            periodType === 'monthly'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={14} /> Monthly League
        </button>
      </div>

      {/* Live Countdown Badge */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
        <Clock size={15} className="text-purple-400 animate-pulse shrink-0" />
        <span>
          {periodType === 'weekly' ? 'Resets in' : 'Ends in'} <strong className="text-white font-mono font-extrabold">{timeLeft}</strong>
        </span>
      </div>
    </div>
  );
}

export default React.memo(PeriodToggleCountdown);
