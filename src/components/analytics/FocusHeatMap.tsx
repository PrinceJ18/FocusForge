import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDay,
  subMonths,
  addMonths,
  isToday as isDateToday,
  isSameMonth,
} from 'date-fns';
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Wallet,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useStore, type FocusSession, type Task, type Expense } from '../../store/useStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { formatFocusTime } from '../../lib/formatUtils';
import type { AnalyticsPeriod } from '../../lib/statistics/analyticsEngine';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface FocusHeatMapProps {
  period: AnalyticsPeriod;
}

interface DayAggregate {
  dateStr: string;
  date: Date;
  focusMinutes: number;
  sessionCount: number;
  sessions: FocusSession[];
  completedTasks: Task[];
  expenses: Expense[];
  xpEarned: number;
  isToday: boolean;
}

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FocusHeatMap({ period }: FocusHeatMapProps) {
  const { focusSessions, tasks, taskCompletions, expenses, events } = useStore();

  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [hoveredDay, setHoveredDay] = useState<{
    day: DayAggregate;
    rect: DOMRect;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);
  const [focusedDateStr, setFocusedDateStr] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset monthOffset whenever the period changes
  useEffect(() => {
    setMonthOffset(0);
  }, [period]);

  // 1. Build an optimized O(1) date-indexed map for all productivity data
  const dayIndex = useMemo(() => {
    const map = new Map<string, DayAggregate>();

    const getOrCreate = (dStr: string): DayAggregate => {
      let item = map.get(dStr);
      if (!item) {
        const d = parseISO(dStr);
        item = {
          dateStr: dStr,
          date: d,
          focusMinutes: 0,
          sessionCount: 0,
          sessions: [],
          completedTasks: [],
          expenses: [],
          xpEarned: 0,
          isToday: isDateToday(d),
        };
        map.set(dStr, item);
      }
      return item;
    };

    // Focus Sessions
    focusSessions.forEach((s) => {
      const dStr = s.session_date?.slice(0, 10);
      if (dStr) {
        const record = getOrCreate(dStr);
        record.focusMinutes += s.minutes || 0;
        record.sessionCount += s.sessions_count || 1;
        record.sessions.push(s);
      }
    });

    // Completed Tasks
    tasks.forEach((t) => {
      if (t.status === 'completed' && t.completed_at) {
        const dStr = t.completed_at.slice(0, 10);
        const record = getOrCreate(dStr);
        record.completedTasks.push(t);
        // XP estimate per task priority
        const xp = t.priority === 'high' ? 20 : t.priority === 'medium' ? 10 : 5;
        record.xpEarned += xp;
      }
    });

    // Task completions (recurring)
    if (taskCompletions && taskCompletions.length > 0) {
      taskCompletions.forEach((tc) => {
        if (tc.status === 'completed' && tc.occurrence_date) {
          const record = getOrCreate(tc.occurrence_date);
          record.xpEarned += 10;
        }
      });
    }

    // Expenses
    expenses.forEach((e) => {
      const dStr = e.expense_date?.slice(0, 10);
      if (dStr) {
        const record = getOrCreate(dStr);
        record.expenses.push(e);
      }
    });

    // XP Events
    events.forEach((ev) => {
      if (ev.timestamp && ev.details?.xp) {
        const dStr = ev.timestamp.slice(0, 10);
        const record = getOrCreate(dStr);
        record.xpEarned += Number(ev.details.xp) || 0;
      }
    });

    return map;
  }, [focusSessions, tasks, taskCompletions, expenses, events]);

  // 2. Determine number of months to display based on period & responsive constraints
  const monthsToDisplay = useMemo(() => {
    if (period === '7d' || period === '30d') {
      return 1;
    }
    if (period === '90d') {
      return 3;
    }
    // 'all' time default: 3 months with seamless pagination
    return 3;
  }, [period]);

  // 3. Generate calendar months array
  const calendarMonths = useMemo(() => {
    const now = new Date();
    const targetBase = addMonths(now, monthOffset);

    const list: Array<{
      monthDate: Date;
      monthName: string;
      year: number;
      weeks: Array<Array<DayAggregate | null>>;
      totalFocus: number;
      totalSessions: number;
    }> = [];

    for (let i = monthsToDisplay - 1; i >= 0; i--) {
      const mDate = subMonths(targetBase, i);
      const mStart = startOfMonth(mDate);
      const daysCount = getDaysInMonth(mDate);
      const startDay = getDay(mStart); // 0 = Sunday

      const weeks: Array<Array<DayAggregate | null>> = [];
      let currentWeek: Array<DayAggregate | null> = [];

      // Leading empty blanks
      for (let b = 0; b < startDay; b++) {
        currentWeek.push(null);
      }

      let monthTotalFocus = 0;
      let monthTotalSessions = 0;

      // Month days
      for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
        const dStr = `${format(mDate, 'yyyy-MM')}-${String(dayNum).padStart(2, '0')}`;
        let agg = dayIndex.get(dStr);
        if (!agg) {
          const d = parseISO(dStr);
          agg = {
            dateStr: dStr,
            date: d,
            focusMinutes: 0,
            sessionCount: 0,
            sessions: [],
            completedTasks: [],
            expenses: [],
            xpEarned: 0,
            isToday: isDateToday(d),
          };
        }

        monthTotalFocus += agg.focusMinutes;
        monthTotalSessions += agg.sessionCount;

        currentWeek.push(agg);

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // Trailing empty blanks
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
      }

      list.push({
        monthDate: mDate,
        monthName: format(mDate, 'MMMM yyyy'),
        year: mDate.getFullYear(),
        weeks,
        totalFocus: monthTotalFocus,
        totalSessions: monthTotalSessions,
      });
    }

    return list;
  }, [monthsToDisplay, monthOffset, dayIndex]);

  // 4. Intensity Level Stylings (Levels 0 through 5)
  const getIntensityStyle = (minutes: number, isCurrentDay: boolean) => {
    let bg = 'rgba(255, 255, 255, 0.03)';
    let border = '1px solid rgba(255, 255, 255, 0.05)';
    let shadow = 'none';
    let level = 0;

    if (minutes > 0 && minutes <= 20) {
      bg = 'rgba(168, 85, 247, 0.20)';
      border = '1px solid rgba(168, 85, 247, 0.35)';
      level = 1;
    } else if (minutes > 20 && minutes <= 40) {
      bg = 'rgba(168, 85, 247, 0.40)';
      border = '1px solid rgba(168, 85, 247, 0.55)';
      level = 2;
    } else if (minutes > 40 && minutes <= 60) {
      bg = 'rgba(168, 85, 247, 0.65)';
      border = '1px solid rgba(168, 85, 247, 0.75)';
      level = 3;
    } else if (minutes > 60 && minutes <= 90) {
      bg = 'rgba(168, 85, 247, 0.85)';
      border = '1px solid rgba(192, 132, 252, 0.9)';
      level = 4;
    } else if (minutes > 90) {
      bg = '#c084fc';
      border = '1px solid #e9d5ff';
      shadow = '0 0 12px rgba(168, 85, 247, 0.65)';
      level = 5;
    }

    return { bg, border, shadow, level };
  };

  // Keyboard navigation across cells
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, day: DayAggregate) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectedDay(day);
      }
    },
    []
  );

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5 relative">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.3), rgba(168,85,247,0.05))',
              boxShadow: '0 0 15px rgba(168,85,247,0.2)',
            }}
          >
            <Flame size={18} style={{ color: '#c084fc' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Focus Heat Map
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Live Grid
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Daily focus intensity across your productivity journey.
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 transition-all"
              title="Jump to current month"
            >
              <RotateCcw size={12} />
              Today
            </button>
          )}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Calendar Months Grid ═══ */}
      <div
        ref={containerRef}
        className={`grid gap-6 ${
          calendarMonths.length === 1
            ? 'grid-cols-1 max-w-sm mx-auto'
            : calendarMonths.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {calendarMonths.map((month) => (
          <div
            key={month.monthName}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col space-y-3"
          >
            {/* Month Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-purple-400" />
                {month.monthName}
              </span>
              <span className="text-[11px] font-mono text-purple-400 font-semibold">
                {formatFocusTime(month.totalFocus)}
              </span>
            </div>

            {/* Calendar Table Grid */}
            <div className="flex gap-2">
              {/* Vertical Weekday Label Axis */}
              <div className="flex flex-col justify-between pt-5 pb-1 select-none">
                {WEEKDAY_NAMES.map((d, i) => (
                  <span
                    key={d}
                    className="text-[9px] font-semibold text-slate-500 h-6 flex items-center justify-center"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Weeks & Days */}
              <div className="flex-1 flex flex-col gap-1.5">
                {/* Horizontal Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center select-none">
                  {WEEKDAY_NAMES.map((w) => (
                    <span key={w} className="text-[9px] font-medium text-slate-500 uppercase">
                      {w.charAt(0)}
                    </span>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="flex flex-col gap-1.5">
                  {month.weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1.5">
                      {week.map((day, di) => {
                        if (!day) {
                          return (
                            <div
                              key={`blank-${di}`}
                              className="w-full aspect-square rounded-md opacity-0 pointer-events-none"
                            />
                          );
                        }

                        const { bg, border, shadow } = getIntensityStyle(
                          day.focusMinutes,
                          day.isToday
                        );
                        const isSelected = selectedDay?.dateStr === day.dateStr;

                        return (
                          <div
                            key={day.dateStr}
                            role="gridcell"
                            tabIndex={0}
                            aria-label={`${format(day.date, 'MMMM d, yyyy')}: ${
                              day.focusMinutes
                            } minutes focused, ${day.sessionCount} sessions, ${
                              day.completedTasks.length
                            } tasks completed`}
                            onClick={() => setSelectedDay(day)}
                            onKeyDown={(e) => handleKeyDown(e, day)}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay({ day, rect });
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                            onFocus={(e) => {
                              setFocusedDateStr(day.dateStr);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay({ day, rect });
                            }}
                            onBlur={() => {
                              setFocusedDateStr(null);
                              setHoveredDay(null);
                            }}
                            style={{
                              backgroundColor: bg,
                              border: isSelected
                                ? '2px solid #a855f7'
                                : day.isToday
                                ? '2px solid rgba(255, 255, 255, 0.95)'
                                : border,
                              boxShadow: isSelected
                                ? '0 0 14px rgba(168,85,247,0.8)'
                                : day.isToday
                                ? '0 0 10px rgba(255,255,255,0.4)'
                                : shadow,
                            }}
                            className={`w-full aspect-square rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center text-[10px] font-semibold select-none group relative ${
                              day.isToday ? 'animate-pulse' : 'hover:scale-115 hover:z-10'
                            }`}
                          >
                            <span
                              className={`transition-colors ${
                                day.focusMinutes >= 40
                                  ? 'text-white'
                                  : day.focusMinutes > 0
                                  ? 'text-purple-200'
                                  : 'text-slate-500 opacity-60'
                              }`}
                            >
                              {day.date.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Floating Hover Card ═══ */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none p-3 rounded-xl backdrop-blur-xl bg-slate-900/95 border border-purple-500/30 text-white shadow-2xl space-y-1.5 min-w-[180px] animate-fadeIn"
          style={{
            top: Math.max(10, hoveredDay.rect.top - 110),
            left: Math.min(
              window.innerWidth - 200,
              Math.max(10, hoveredDay.rect.left + hoveredDay.rect.width / 2 - 90)
            ),
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="text-xs font-bold text-slate-200">
              {format(hoveredDay.day.date, 'EEE, MMM d')}
            </span>
            {hoveredDay.day.isToday && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500 text-white">
                TODAY
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Focus:</span>
              <span className="font-bold text-purple-400 font-mono">
                {formatFocusTime(hoveredDay.day.focusMinutes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sessions:</span>
              <span className="font-semibold text-slate-200">{hoveredDay.day.sessionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tasks:</span>
              <span className="font-semibold text-cyan-400">
                {hoveredDay.day.completedTasks.length} done
              </span>
            </div>
            {hoveredDay.day.xpEarned > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">XP Earned:</span>
                <span className="font-bold text-amber-400">+{hoveredDay.day.xpEarned} XP</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Minimal Bottom Legend ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Less Focus</span>
          <div className="flex items-center gap-1.5">
            {[0, 15, 30, 50, 80, 120].map((mins, idx) => {
              const { bg, border, shadow } = getIntensityStyle(mins, false);
              return (
                <div
                  key={idx}
                  className="w-3.5 h-3.5 rounded-sm"
                  style={{ backgroundColor: bg, border, boxShadow: shadow }}
                  title={`${mins === 0 ? '0 min' : mins >= 120 ? '120+ min' : `${mins} min`}`}
                />
              );
            })}
          </div>
          <span>More Focus (120+ min)</span>
        </div>

        <span className="text-[10px] text-slate-500">
          Click any date for detailed productivity log
        </span>
      </div>

      {/* ═══ Day Details Popover / Modal ═══ */}
      {selectedDay && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDay(null)}
          title={format(selectedDay.date, 'EEEE, MMMM d, yyyy')}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Focus Time
                </span>
                <span className="text-base font-bold text-purple-400 font-mono mt-0.5 block">
                  {formatFocusTime(selectedDay.focusMinutes)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Tasks Done
                </span>
                <span className="text-base font-bold text-cyan-400 font-mono mt-0.5 block">
                  {selectedDay.completedTasks.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  XP Gained
                </span>
                <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                  +{selectedDay.xpEarned} XP
                </span>
              </div>
            </div>

            {/* Focus Sessions List */}
            <div>
              <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5 text-xs">
                <Clock size={14} className="text-purple-400" />
                Focus Sessions ({selectedDay.sessions.length})
              </h4>
              {selectedDay.sessions.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedDay.sessions.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="font-semibold">Session #{idx + 1}</span>
                      </div>
                      <span className="font-bold text-purple-300 font-mono">
                        {formatFocusTime(s.minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px] italic">
                  No focus sessions logged on this day.
                </p>
              )}
            </div>

            {/* Completed Tasks List */}
            <div>
              <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5 text-xs">
                <CheckCircle2 size={14} className="text-cyan-400" />
                Completed Tasks ({selectedDay.completedTasks.length})
              </h4>
              {selectedDay.completedTasks.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedDay.completedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-slate-300 truncate max-w-[200px]">{t.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          t.priority === 'high'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px] italic">
                  No tasks completed on this day.
                </p>
              )}
            </div>

            {/* Expenses List */}
            {selectedDay.expenses.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5 text-xs">
                  <Wallet size={14} className="text-pink-400" />
                  Expenses Logged ({selectedDay.expenses.length})
                </h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedDay.expenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-slate-300 truncate max-w-[200px]">{e.title}</span>
                      <span className="font-bold text-pink-400 font-mono">
                        {formatCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
