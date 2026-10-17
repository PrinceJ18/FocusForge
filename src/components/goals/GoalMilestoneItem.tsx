import React, { useState } from 'react';
import { Check, Edit3, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { GoalMilestone } from '../../types/goals';
import type { Task } from '../../store/slices/types';

interface GoalMilestoneItemProps {
  milestone: GoalMilestone;
  linkedTask?: Task;
  isGoalCompleted: boolean;
  onToggle: (milestoneId: string, currentCompleted: boolean) => Promise<void>;
  onEdit: (milestone: GoalMilestone) => void;
  onDelete: (milestoneId: string) => Promise<void>;
}

export default function GoalMilestoneItem({
  milestone,
  linkedTask,
  isGoalCompleted,
  onToggle,
  onEdit,
  onDelete,
}: GoalMilestoneItemProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    if (isGoalCompleted || toggling) return;
    try {
      setToggling(true);
      await onToggle(milestone.id, milestone.completed);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (isGoalCompleted || deleting) return;
    try {
      setDeleting(true);
      await onDelete(milestone.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all duration-200 ${
        milestone.completed
          ? 'bg-background-card/40 border-border/50 text-text-muted'
          : 'bg-background-card-hover/40 border-border hover:border-primary/40 text-text-primary'
      }`}
    >
      {/* Left: Checkbox + Title + Linked Task */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isGoalCompleted || toggling}
          className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
            milestone.completed
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border border-border hover:border-primary bg-background-card/80 text-transparent hover:text-text-muted'
          } ${isGoalCompleted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          title={
            isGoalCompleted
              ? 'Goal already completed'
              : milestone.completed
              ? 'Mark incomplete (reopen)'
              : 'Mark milestone completed (+10 XP)'
          }
          aria-label={`Toggle milestone: ${milestone.title}`}
        >
          {toggling ? (
            <Loader2 size={12} className="animate-spin text-primary" />
          ) : (
            <Check size={12} strokeWidth={3} className={milestone.completed ? 'block' : 'opacity-0 group-hover:opacity-40'} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium truncate ${
              milestone.completed ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          >
            {milestone.title}
          </p>

          {/* Linked Task badge */}
          {linkedTask && (
            <div
              className="inline-flex items-center gap-1 mt-1 text-[10px] text-text-muted hover:text-text-secondary bg-background-card px-1.5 py-0.5 rounded border border-border"
              title={`Linked to task: ${linkedTask.title}`}
            >
              <LinkIcon size={9} className="text-primary flex-shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {linkedTask.title}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  linkedTask.priority === 'high'
                    ? 'bg-rose-500'
                    : linkedTask.priority === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: XP chip + Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            milestone.completed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-primary/10 text-primary border-primary/20'
          }`}
        >
          +10 XP
        </span>

        {!isGoalCompleted && (
          <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(milestone)}
              className="p-1 rounded hover:bg-background-card hover:text-text-primary text-text-muted transition-colors"
              title="Edit milestone"
              aria-label="Edit milestone"
            >
              <Edit3 size={13} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-text-muted transition-colors"
              title="Delete milestone"
              aria-label="Delete milestone"
            >
              {deleting ? (
                <Loader2 size={13} className="animate-spin text-rose-400" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
