import React from 'react';
import Modal from '../ui/Modal';
import { ArenaScore, PeriodType } from '../../types/arena';
import { 
  normalizeProductivityScore, 
  normalizeFocusMinutes, 
  normalizeTasksCompleted, 
  normalizeChallengePoints,
  DEFAULT_WEIGHTS,
  WEEKLY_TARGETS,
  MONTHLY_TARGETS
} from '../../lib/arena/arenaScoreEngine';
import { Trophy, Clock, CheckCircle2, Zap, Target, HelpCircle } from 'lucide-react';

interface ArenaScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  userScore: ArenaScore | null;
  periodType?: PeriodType;
}

export default function ArenaScoreBreakdown({
  isOpen,
  onClose,
  userScore,
  periodType = 'weekly',
}: ArenaScoreBreakdownProps) {
  if (!isOpen) return null;

  const targets = periodType === 'monthly' ? MONTHLY_TARGETS : WEEKLY_TARGETS;

  const prodRaw = userScore?.productivity_score_snapshot || 0;
  const focusRaw = userScore?.focus_minutes || 0;
  const tasksRaw = userScore?.tasks_completed || 0;
  const challengeRaw = userScore?.daily_challenge_points || 0;

  // Normalized (0.0 to 1.0)
  const normProd = normalizeProductivityScore(prodRaw);
  const normFocus = normalizeFocusMinutes(focusRaw, targets.focusMinutesTarget);
  const normTasks = normalizeTasksCompleted(tasksRaw, targets.tasksCompletedTarget);
  const normChallenge = normalizeChallengePoints(challengeRaw, targets.challengePointsTarget);

  // Exact point contributions adding up to Arena Score (0-100)
  const prodPoints = Math.round(normProd * DEFAULT_WEIGHTS.productivityWeight * 100);
  const focusPoints = Math.round(normFocus * DEFAULT_WEIGHTS.focusMinutesWeight * 100);
  const tasksPoints = Math.round(normTasks * DEFAULT_WEIGHTS.tasksCompletedWeight * 100);
  const challengePoints = Math.round(normChallenge * DEFAULT_WEIGHTS.challengePointsWeight * 100);

  const totalScore = userScore?.arena_score || (prodPoints + focusPoints + tasksPoints + challengePoints);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Arena Score Breakdown"
      maxWidth="md"
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition"
        >
          Close Breakdown
        </button>
      }
    >
      <div className="space-y-5 text-xs text-left">
        {/* Total Score Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-purple-500/20 border border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Arena Score</div>
            <div className="text-2xl font-black text-purple-300 font-mono mt-0.5">{totalScore} <span className="text-xs font-normal text-slate-400">/ 100 max</span></div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black text-xl shadow">
            🏆
          </div>
        </div>

        {/* Formula Explanation Callout */}
        <p className="text-slate-400 text-[11px] bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          Arena Score is normalized between 0 and 100 to prevent any single metric from dominating the competition.
        </p>

        {/* Breakdown Items List */}
        <div className="space-y-3">
          {/* 1. Productivity Score (45%) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <Zap size={16} />
              </div>
              <div>
                <div className="font-bold text-slate-200">Productivity Score <span className="text-[10px] text-purple-400 font-semibold">(45% Weight)</span></div>
                <div className="text-[10px] text-slate-400">Snapshot: {prodRaw} / 100</div>
              </div>
            </div>
            <div className="text-base font-black text-purple-300 font-mono">+{prodPoints} <span className="text-[10px] text-slate-500">pts</span></div>
          </div>

          {/* 2. Focus Minutes (25%) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Clock size={16} />
              </div>
              <div>
                <div className="font-bold text-slate-200">Focus Minutes <span className="text-[10px] text-cyan-400 font-semibold">(25% Weight)</span></div>
                <div className="text-[10px] text-slate-400">{focusRaw}m / {targets.focusMinutesTarget}m target</div>
              </div>
            </div>
            <div className="text-base font-black text-cyan-300 font-mono">+{focusPoints} <span className="text-[10px] text-slate-500">pts</span></div>
          </div>

          {/* 3. Tasks Completed (20%) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="font-bold text-slate-200">Tasks Completed <span className="text-[10px] text-emerald-400 font-semibold">(20% Weight)</span></div>
                <div className="text-[10px] text-slate-400">{tasksRaw} / {targets.tasksCompletedTarget} target</div>
              </div>
            </div>
            <div className="text-base font-black text-emerald-300 font-mono">+{tasksPoints} <span className="text-[10px] text-slate-500">pts</span></div>
          </div>

          {/* 4. Daily Challenge Points (10%) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Target size={16} />
              </div>
              <div>
                <div className="font-bold text-slate-200">Daily Challenge <span className="text-[10px] text-amber-400 font-semibold">(10% Weight)</span></div>
                <div className="text-[10px] text-slate-400">{challengeRaw} / {targets.challengePointsTarget} target</div>
              </div>
            </div>
            <div className="text-base font-black text-amber-300 font-mono">+{challengePoints} <span className="text-[10px] text-slate-500">pts</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
