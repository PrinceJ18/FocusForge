import React, { useState } from 'react';
import { Trophy, Sparkles, AlertTriangle, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { isBonusEligible, formatGoalPeriod } from './goalsUiUtils';
import type { Goal } from '../../types/goals';

interface GoalCompleteConfirmModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onConfirm: (goalId: string) => Promise<void>;
}

export default function GoalCompleteConfirmModal({
  isOpen,
  goal,
  onClose,
  onConfirm,
}: GoalCompleteConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);

  if (!goal) return null;

  const bonusEligible = isBonusEligible(goal);
  const baseXP = goal.base_xp;
  const bonusXP = bonusEligible ? goal.bonus_xp : 0;
  const totalAwardableXP = baseXP + bonusXP;

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await onConfirm(goal.id);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Goal & Claim XP"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button
            variant="neon"
            onClick={handleConfirm}
            isLoading={confirming}
            icon={Trophy}
          >
            Confirm & Claim +{totalAwardableXP} XP
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Goal summary header */}
        <div className="p-3.5 rounded-xl bg-background-card border border-border">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
            {formatGoalPeriod(goal.period)} Goal
          </div>
          <h4
            className="text-base font-bold text-text-primary mt-1"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            {goal.title}
          </h4>
          {goal.description && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{goal.description}</p>
          )}
        </div>

        {/* XP Reward Breakdown */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <Sparkles size={14} className="text-primary" />
            <span>Reward Breakdown (Server-Authoritative)</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Base XP */}
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-text-secondary flex items-center gap-1.5">
                <Check size={13} className="text-emerald-400" />
                Base Completion XP
              </span>
              <span className="font-bold text-emerald-400">+{baseXP} XP</span>
            </div>

            {/* Early / On-Time Bonus XP */}
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-text-secondary flex items-center gap-1.5">
                {bonusEligible ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={13} className="text-amber-400" />
                )}
                Early / On-Time Completion Bonus
              </span>
              <span
                className={`font-bold ${
                  bonusEligible ? 'text-emerald-400' : 'text-text-muted line-through'
                }`}
              >
                +{goal.bonus_xp} XP
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-text-primary">Total Authoritative Reward:</span>
              <span
                className="text-base font-black text-primary"
                style={{ fontFamily: 'Space Grotesk' }}
              >
                +{totalAwardableXP} XP
              </span>
            </div>
          </div>
        </div>

        {/* Warning if deadline missed in strict mode */}
        {!bonusEligible && goal.is_strict && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Strict Deadline Expired</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Because this goal was in Strict Mode and finished past its target deadline, the +{goal.bonus_xp} XP early bonus has expired. You will still receive full base XP (+{baseXP} XP).
              </p>
            </div>
          </div>
        )}

        {/* Irreversibility notice */}
        <p className="text-[11px] text-text-muted leading-relaxed">
          ⚠️ Completing this goal locks its status as completed and updates your authoritative profile XP ledger on the server. This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
